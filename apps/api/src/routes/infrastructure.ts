import { FastifyInstance } from "fastify";
import sql from "../db/sql.js";
import { getUser } from "../middleware/rbac.js";
import * as k8s from "@kubernetes/client-node";
import { genId } from "../utils/id.js";
import { getK8sClient } from "../services/k8s.js";

function parseQuantity(q: string | undefined): number {
  if (!q) return 0;
  if (q.endsWith("m")) return parseInt(q) / 1000;
  if (q.endsWith("Ki")) return parseInt(q) / 1024;
  if (q.endsWith("Mi")) return parseInt(q);
  if (q.endsWith("Gi")) return parseInt(q) * 1024;
  return parseFloat(q);
}

export default async function infrastructureRoutes(app: FastifyInstance) {

  // GET /api/infrastructure/:clusterId/nodes
  app.get("/:clusterId/nodes", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { clusterId } = req.params as { clusterId: string };

    // Verify cluster belongs to org
    const [cluster] = await sql`SELECT cluster_id FROM clusters WHERE cluster_id = ${clusterId} AND org_id = ${org_id}`;
    if (!cluster) return reply.status(404).send({ detail: "Cluster not found" });

    try {
      const { core, metrics } = await getK8sClient(clusterId);

      const [nodesRes, nodeMetricsRes] = await Promise.all([
        core.listNode(),
        metrics.getNodeMetrics(),
      ]);

      // Successfully connected to cluster! Mark as connected
      await sql`UPDATE clusters SET status = 'connected', last_seen_at = now() WHERE cluster_id = ${clusterId}`;

      const metricsMap = new Map(
        nodeMetricsRes.items.map((m: any) => [m.metadata.name, m.usage])
      );

      const nodes = nodesRes.items.map((node: any) => {
        const name = node.metadata.name;
        const usage = metricsMap.get(name) as any || {};

        const cpuCores = parseFloat(node.status.capacity?.cpu || "0");
        const memGiB   = parseFloat(node.status.capacity?.memory?.replace("Ki","") || "0") / 1024 / 1024;
        const cpuUsed  = parseQuantity(usage.cpu);
        const memUsedMi= parseQuantity(usage.memory);
        const memTotalMi = memGiB * 1024;

        const role = node.metadata.labels?.["node-role.kubernetes.io/control-plane"] !== undefined ||
                     node.metadata.labels?.["node-role.kubernetes.io/master"] !== undefined
          ? "master" : "worker";

        const ready = node.status.conditions?.find((c: any) => c.type === "Ready")?.status === "True";

        const podCount = 0; // Would need separate query
        const podCap = parseInt(node.status.capacity?.pods || "110");

        const creationTime = new Date(node.metadata.creationTimestamp);
        const ageDays = Math.floor((Date.now() - creationTime.getTime()) / 86400000);
        const age = ageDays > 0 ? `${ageDays}d` : "< 1d";

        return {
          name,
          role,
          status: ready ? "Ready" : "NotReady",
          cpu_cores: cpuCores,
          memory_gb: Math.round(memGiB * 10) / 10,
          cpu_usage_pct: Math.min(Math.round((cpuUsed / cpuCores) * 100), 100),
          memory_usage_pct: memTotalMi > 0 ? Math.min(Math.round((memUsedMi / memTotalMi) * 100), 100) : 0,
          pods_running: podCount,
          pods_capacity: podCap,
          age,
          conditions: (node.status.conditions || []).map((c: any) => ({ type: c.type, status: c.status })),
        };
      });

      let masterReady = 0, masterTotal = 0, workerReady = 0, workerTotal = 0;
      nodes.forEach((n: any) => {
        const isReady = n.status === "Ready";
        if (n.role === "master") {
          masterTotal++;
          if (isReady) masterReady++;
        } else {
          workerTotal++;
          if (isReady) workerReady++;
        }
      });

      await sql`
        UPDATE clusters
        SET status = 'connected',
            last_seen_at = now(),
            master_nodes_ready = ${masterReady},
            master_nodes_total = ${masterTotal},
            worker_nodes_ready = ${workerReady},
            worker_nodes_total = ${workerTotal}
        WHERE cluster_id = ${clusterId}
      `;

      return { nodes };
    } catch (err: any) {
      console.error("[infra] Node metrics error:", err.message);
      // Return empty if K8s not available
      return { nodes: [], error: "K8s metrics not available. Ensure Metrics Server is installed." };
    }
  });

  // GET /api/infrastructure/:clusterId/pods
  app.get("/:clusterId/pods", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { clusterId } = req.params as { clusterId: string };

    const [cluster] = await sql`SELECT cluster_id FROM clusters WHERE cluster_id = ${clusterId} AND org_id = ${org_id}`;
    if (!cluster) return reply.status(404).send({ detail: "Cluster not found" });

    try {
      const { core, metrics } = await getK8sClient(clusterId);

      const [podsRes, podMetricsRes] = await Promise.all([
        core.listPodForAllNamespaces(),
        metrics.getPodMetrics(),
      ]);

      // Successfully connected to cluster! Mark as connected
      await sql`UPDATE clusters SET status = 'connected', last_seen_at = now() WHERE cluster_id = ${clusterId}`;

      const metricsMap = new Map(
        podMetricsRes.items.map((m: any) => [`${m.metadata.namespace}/${m.metadata.name}`, m.containers])
      );

      const pods = podsRes.items.map((pod: any) => {
        const name = pod.metadata.name;
        const ns   = pod.metadata.namespace;
        const key  = `${ns}/${name}`;
        const containerMetrics = metricsMap.get(key) || [];

        const cpuUsed  = containerMetrics.reduce((a: number, c: any) => a + parseQuantity(c.usage?.cpu) * 1000, 0);
        const memUsed  = containerMetrics.reduce((a: number, c: any) => a + parseQuantity(c.usage?.memory), 0);

        const containers = pod.spec?.containers || [];
        const cpuLimit  = containers.reduce((a: number, c: any) => a + parseQuantity(c.resources?.limits?.cpu) * 1000, 0);
        const memLimit  = containers.reduce((a: number, c: any) => a + parseQuantity(c.resources?.limits?.memory), 0);

        const restarts = (pod.status?.containerStatuses || []).reduce((a: number, c: any) => a + (c.restartCount || 0), 0);

        const creationTime = new Date(pod.metadata.creationTimestamp);
        const ageDays = Math.floor((Date.now() - creationTime.getTime()) / 86400000);
        const age = ageDays > 0 ? `${ageDays}d` : "< 1d";

        return {
          name,
          namespace: ns,
          node: pod.spec?.nodeName || "—",
          status: pod.status?.phase || "Unknown",
          cpu_usage_m: Math.round(cpuUsed),
          memory_usage_mi: Math.round(memUsed),
          cpu_limit_m: cpuLimit > 0 ? Math.round(cpuLimit) : undefined,
          memory_limit_mi: memLimit > 0 ? Math.round(memLimit) : undefined,
          restarts,
          age,
        };
      });

      return { pods };
    } catch (err: any) {
      console.error("[infra] Pod metrics error:", err.message);
      return { pods: [], error: "K8s metrics not available" };
    }
  });

  // GET /api/resource-alerts
  app.get("/../../resource-alerts", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { cluster_id } = req.query as { cluster_id?: string };

    const alerts = cluster_id
      ? await sql`SELECT * FROM resource_alerts WHERE org_id = ${org_id} AND cluster_id = ${cluster_id} ORDER BY created_at DESC`
      : await sql`SELECT * FROM resource_alerts WHERE org_id = ${org_id} ORDER BY created_at DESC`;

    return { alerts };
  });

  // POST /api/resource-alerts
  app.post("/../../resource-alerts", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { cluster_id, resource_type, threshold_pct, target, target_name, severity } = req.body as any;

    const id = genId("ral");
    const [alert] = await sql`
      INSERT INTO resource_alerts (resource_alert_id, org_id, cluster_id, resource_type, threshold_pct, target, target_name, severity)
      VALUES (${id}, ${org_id}, ${cluster_id}, ${resource_type}, ${threshold_pct}, ${target}, ${target_name || null}, ${severity})
      RETURNING *
    `;
    return { alert };
  });

  // DELETE /api/resource-alerts/:id
  app.delete("/../../resource-alerts/:id", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM resource_alerts WHERE resource_alert_id = ${id} AND org_id = ${org_id}`;
    return { message: "Deleted" };
  });
}