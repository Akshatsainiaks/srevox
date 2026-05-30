import sql from "../db/sql.js";
import redis from "../db/redis.js";
import { getK8sClient } from "./k8s.js";

function parseQuantity(q: string | undefined): number {
  if (!q) return 0;
  if (q.endsWith("m")) return parseInt(q) / 1000;
  if (q.endsWith("Ki")) return parseInt(q) / 1024;
  if (q.endsWith("Mi")) return parseInt(q);
  if (q.endsWith("Gi")) return parseInt(q) * 1024;
  return parseFloat(q);
}

export async function checkClusterNodesAndMetrics() {
  const clusters = await sql`
    SELECT cluster_id, name, org_id, node_cpu_threshold, node_memory_threshold,
           master_alerts_enabled, worker_alerts_enabled, status, error_message
    FROM clusters
    WHERE status IN ('connected', 'error')
  `;

  for (const cluster of clusters) {
    try {
      const { core, metrics } = await getK8sClient(cluster.cluster_id);
      const [nodesRes, nodeMetricsRes] = await Promise.all([
        core.listNode(),
        metrics.getNodeMetrics().catch(() => ({ items: [] })), // Allow metrics server to fail gracefully
      ]);

      const metricsMap = new Map(
        nodeMetricsRes.items.map((m: any) => [m.metadata.name, m.usage])
      );

      let masterReady = 0;
      let masterTotal = 0;
      let workerReady = 0;
      let workerTotal = 0;

      for (const node of nodesRes.items) {
        const nodeName = node.metadata?.name || "unknown";
        const role = node.metadata?.labels?.["node-role.kubernetes.io/control-plane"] !== undefined ||
                     node.metadata?.labels?.["node-role.kubernetes.io/master"] !== undefined
          ? "master" : "worker";

        // 1. Ready Check
        const readyCond = node.status?.conditions?.find((c: any) => c.type === "Ready");
        const isReady = readyCond?.status === "True";

        if (role === "master") {
          masterTotal++;
          if (isReady) masterReady++;
        } else {
          workerTotal++;
          if (isReady) workerReady++;
        }

        const alertsEnabled = role === "master" ? (cluster.master_alerts_enabled ?? true) : (cluster.worker_alerts_enabled ?? true);

        if (!isReady && alertsEnabled) {
          const cooldownKey = `cooldown:node-alert:${cluster.cluster_id}:${nodeName}:not_ready`;
          const activeCooldown = await redis.get(cooldownKey);
          if (!activeCooldown) {
            await redis.publish(
              "srevox:system_alerts",
              JSON.stringify({
                event_type: "cluster_error",
                org_id: cluster.org_id,
                cluster_id: cluster.cluster_id,
                cluster_name: cluster.name,
                details: `${role.toUpperCase()} Node '${nodeName}' is offline / NotReady!`,
              })
            );
            await redis.setex(cooldownKey, 900, "1"); // 15 mins cooldown
          }
        }

        // 2. Condition checks
        const conditions = node.status?.conditions || [];
        for (const cond of conditions) {
          // Warning conditions (MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable)
          if (cond.type !== "Ready" && cond.status === "True" && alertsEnabled) {
            const cooldownKey = `cooldown:node-alert:${cluster.cluster_id}:${nodeName}:${cond.type}`;
            const activeCooldown = await redis.get(cooldownKey);
            if (!activeCooldown) {
              await redis.publish(
                "srevox:system_alerts",
                JSON.stringify({
                  event_type: "cluster_error",
                  org_id: cluster.org_id,
                  cluster_id: cluster.cluster_id,
                  cluster_name: cluster.name,
                  details: `Node '${nodeName}' reports condition warning: ${cond.type}! Details: ${cond.message || ""}`,
                })
              );
              await redis.setex(cooldownKey, 900, "1"); // 15 mins cooldown
            }
          }
        }

        // 3. CPU and Memory Checks (if metrics available)
        const usage = metricsMap.get(nodeName) as any;
        if (usage && alertsEnabled) {
          const cpuCores = parseFloat(node.status?.capacity?.cpu || "0");
          const memGiB   = parseFloat(node.status?.capacity?.memory?.replace("Ki","") || "0") / 1024 / 1024;
          const cpuUsed  = parseQuantity(usage.cpu);
          const memUsedMi= parseQuantity(usage.memory);
          const memTotalMi = memGiB * 1024;

          const cpuUsagePct = Math.min(Math.round((cpuUsed / cpuCores) * 100), 100);
          const memUsagePct = memTotalMi > 0 ? Math.min(Math.round((memUsedMi / memTotalMi) * 100), 100) : 0;

          const cpuThreshold = cluster.node_cpu_threshold ?? 85;
          const memThreshold = cluster.node_memory_threshold ?? 90;

          if (cpuUsagePct > cpuThreshold) {
            const cooldownKey = `cooldown:node-alert:${cluster.cluster_id}:${nodeName}:cpu_high`;
            const activeCooldown = await redis.get(cooldownKey);
            if (!activeCooldown) {
              await redis.publish(
                "srevox:system_alerts",
                JSON.stringify({
                  event_type: "cluster_error",
                  org_id: cluster.org_id,
                  cluster_id: cluster.cluster_id,
                  cluster_name: cluster.name,
                  details: `Node '${nodeName}' CPU usage is extremely high: ${cpuUsagePct}% (threshold is ${cpuThreshold}%)`,
                })
              );
              await redis.setex(cooldownKey, 900, "1");
            }
          }

          if (memUsagePct > memThreshold) {
            const cooldownKey = `cooldown:node-alert:${cluster.cluster_id}:${nodeName}:memory_high`;
            const activeCooldown = await redis.get(cooldownKey);
            if (!activeCooldown) {
              await redis.publish(
                "srevox:system_alerts",
                JSON.stringify({
                  event_type: "cluster_error",
                  org_id: cluster.org_id,
                  cluster_id: cluster.cluster_id,
                  cluster_name: cluster.name,
                  details: `Node '${nodeName}' Memory usage is extremely high: ${memUsagePct}% (threshold is ${memThreshold}%)`,
                })
              );
              await redis.setex(cooldownKey, 900, "1");
            }
          }
        }
      }

      // Update node counts and check recovery state
      const wasError = cluster.status === "error";
      await sql`
        UPDATE clusters
        SET status = 'connected',
            error_message = NULL,
            master_nodes_ready = ${masterReady},
            master_nodes_total = ${masterTotal},
            worker_nodes_ready = ${workerReady},
            worker_nodes_total = ${workerTotal}
        WHERE cluster_id = ${cluster.cluster_id}
      `;

      if (wasError) {
        await redis.publish(
          "srevox:system_alerts",
          JSON.stringify({
            event_type: "cluster_connected",
            org_id: cluster.org_id,
            cluster_id: cluster.cluster_id,
            cluster_name: cluster.name,
            details: `Cluster '${cluster.name}' connection has recovered.`,
          })
        );
      }
    } catch (err: any) {
      console.warn(`[infra-checks] Failed to check nodes for cluster ${cluster.name}:`, err.message);

      if (cluster.status === "connected") {
        await sql`
          UPDATE clusters
          SET status = 'error',
              error_message = ${err.message || 'Unknown connection error'}
          WHERE cluster_id = ${cluster.cluster_id}
        `;
        await redis.publish(
          "srevox:system_alerts",
          JSON.stringify({
            event_type: "cluster_error",
            org_id: cluster.org_id,
            cluster_id: cluster.cluster_id,
            cluster_name: cluster.name,
            details: `Cluster '${cluster.name}' connection failed: ${err.message || 'Unknown error'}`,
          })
        );
      }
    }
  }
}
