import { FastifyInstance } from "fastify";
import { genId } from "../utils/id.js";
import sql from "../db/sql.js";
import redis, { invalidateCache } from "../db/redis.js";
import { getUser, requireRole } from "../middleware/rbac.js";

export default async function clusterRoutes(app: FastifyInstance) {

  // GET /api/clusters — all roles
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const clusters = await sql`
      SELECT c.cluster_id, c.name, c.connection_type, c.cloud_provider, c.k8s_version,
             c.status, c.last_seen_at, c.error_message, c.created_at,
             c.master_nodes_ready, c.master_nodes_total, c.worker_nodes_ready, c.worker_nodes_total,
             c.master_alerts_enabled, c.worker_alerts_enabled, c.node_cpu_threshold, c.node_memory_threshold,
             (SELECT COUNT(*)::int FROM incidents WHERE cluster_id = c.cluster_id AND status = 'open') AS open_incidents_count
      FROM clusters c
      WHERE c.org_id = ${org_id}
      ORDER BY c.created_at DESC
    `;
    return { clusters };
  });

  // GET /api/clusters/:id
  app.get("/:id", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const [cluster] = await sql`
      SELECT * FROM clusters WHERE cluster_id = ${id} AND org_id = ${org_id}
    `;
    if (!cluster) return reply.status(404).send({ detail: "Not found" });
    return cluster;
  });

  // POST /api/clusters — admin only
  app.post("/", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { name, connection_type, kubeconfig, api_server_url, cloud_provider, k8s_version } =
      req.body as any;

    const clusterId   = genId("cls");
    const agent_token = connection_type === "agent" ? genId("agt") : null;

    await sql`
      INSERT INTO clusters
        (cluster_id, org_id, name, connection_type, agent_token, api_server_url,
         cloud_provider, k8s_version, status)
      VALUES
        (${clusterId}, ${org_id}, ${name}, ${connection_type}, ${agent_token},
         ${api_server_url || null}, ${cloud_provider || "other"},
         ${k8s_version || null}, 'pending')
    `;

    await invalidateCache(`clusters:${org_id}`);
    return {
      cluster_id: clusterId, name, connection_type, agent_token, status: "pending",
      install_command: agent_token
        ? `kubectl apply -f https://app.srevox.io/agent.yaml?token=${agent_token}`
        : null,
    };
  });

  // PATCH /api/clusters/:id — admin only
  app.patch("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const {
      name,
      cloud_provider,
      k8s_version,
      master_alerts_enabled,
      worker_alerts_enabled,
      node_cpu_threshold,
      node_memory_threshold,
    } = req.body as any;

    if (name !== undefined)           await sql`UPDATE clusters SET name = ${name} WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    if (cloud_provider !== undefined) await sql`UPDATE clusters SET cloud_provider = ${cloud_provider} WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    if (k8s_version !== undefined)    await sql`UPDATE clusters SET k8s_version = ${k8s_version} WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    if (master_alerts_enabled !== undefined) await sql`UPDATE clusters SET master_alerts_enabled = ${master_alerts_enabled} WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    if (worker_alerts_enabled !== undefined) await sql`UPDATE clusters SET worker_alerts_enabled = ${worker_alerts_enabled} WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    if (node_cpu_threshold !== undefined)    await sql`UPDATE clusters SET node_cpu_threshold = ${node_cpu_threshold} WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    if (node_memory_threshold !== undefined) await sql`UPDATE clusters SET node_memory_threshold = ${node_memory_threshold} WHERE cluster_id = ${id} AND org_id = ${org_id}`;

    await invalidateCache(`clusters:${org_id}`);
    return { message: "Updated" };
  });

  // PATCH /api/clusters/:id/heartbeat — agent calls this (no auth, uses agent_token)
  app.patch("/:id/heartbeat", async (req) => {
    const { id } = req.params as { id: string };
    const { status, k8s_version, error_message, agent_token } = req.body as any;

    // Verify agent token
    const [cluster] = await sql`
      SELECT cluster_id, org_id, name, status, error_message 
      FROM clusters 
      WHERE cluster_id = ${id} AND agent_token = ${agent_token || ""}
    `;
    if (!cluster) return { message: "Invalid token" };

    const newStatus = status || "connected";
    const statusChanged = cluster.status !== newStatus;
    const errorChanged = cluster.error_message !== (error_message || null);

    await sql`
      UPDATE clusters
      SET status = ${newStatus},
          last_seen_at = now(),
          k8s_version = COALESCE(${k8s_version || null}, k8s_version),
          error_message = ${error_message || null}
      WHERE cluster_id = ${id}
    `;

    // Publish alert if status changed or new error is reported
    if (statusChanged || errorChanged) {
      let eventType = "cluster_connected";
      let details = `Cluster '${cluster.name}' is connected and reporting healthy.`;
      
      if (newStatus === "error" || error_message) {
        eventType = "cluster_error";
        details = `Cluster '${cluster.name}' reported an error: ${error_message || "Unknown error"}`;
      } else if (newStatus === "disconnected") {
        eventType = "cluster_disconnected";
        details = `Cluster '${cluster.name}' went offline.`;
      }

      await redis.publish(
        "srevox:system_alerts",
        JSON.stringify({
          event_type: eventType,
          org_id: cluster.org_id,
          cluster_id: id,
          cluster_name: cluster.name,
          details,
        })
      );
    }

    return { message: "Heartbeat recorded" };
  });

  // DELETE /api/clusters/:id — admin only
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };

    const [cluster] = await sql`
      SELECT name, org_id 
      FROM clusters 
      WHERE cluster_id = ${id} AND org_id = ${org_id}
    `;
    if (cluster) {
      await redis.publish(
        "srevox:system_alerts",
        JSON.stringify({
          event_type: "cluster_deleted",
          org_id: cluster.org_id,
          cluster_id: id,
          cluster_name: cluster.name,
          details: `Cluster '${cluster.name}' was permanently deleted by an administrator.`,
        })
      );
    }

    await sql`UPDATE incidents SET cluster_id = NULL, rule_id = NULL WHERE cluster_id = ${id}`;
    await sql`DELETE FROM alert_rules WHERE cluster_id = ${id}`;
    await sql`DELETE FROM clusters WHERE cluster_id = ${id} AND org_id = ${org_id}`;
    await invalidateCache(`clusters:${org_id}`);
    return { message: "Removed" };
  });
}