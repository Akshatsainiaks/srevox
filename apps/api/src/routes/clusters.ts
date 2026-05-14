import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import sql from "../db/sql.js";
import { invalidateCache } from "../db/redis.js";
import { getUser, requireRole } from "../middleware/rbac.js";

export default async function clusterRoutes(app: FastifyInstance) {

  // GET /api/clusters — all roles
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const clusters = await sql`
      SELECT id, name, connection_type, cloud_provider, k8s_version,
             status, last_seen_at, error_message, created_at
      FROM clusters
      WHERE org_id = ${org_id}
      ORDER BY created_at DESC
    `;
    return { clusters };
  });

  // GET /api/clusters/:id
  app.get("/:id", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const [cluster] = await sql`
      SELECT * FROM clusters WHERE id = ${id} AND org_id = ${org_id}
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

    const id          = randomUUID();
    const agent_token = connection_type === "agent" ? randomUUID() : null;

    await sql`
      INSERT INTO clusters
        (id, org_id, name, connection_type, agent_token, api_server_url,
         cloud_provider, k8s_version, status)
      VALUES
        (${id}, ${org_id}, ${name}, ${connection_type}, ${agent_token},
         ${api_server_url || null}, ${cloud_provider || "other"},
         ${k8s_version || null}, 'pending')
    `;

    await invalidateCache(`clusters:${org_id}`);
    return {
      id, name, connection_type, agent_token, status: "pending",
      install_command: agent_token
        ? `kubectl apply -f https://app.loopzen.io/agent.yaml?token=${agent_token}`
        : null,
    };
  });

  // PATCH /api/clusters/:id — admin only
  app.patch("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const { name, cloud_provider, k8s_version } = req.body as any;

    if (name)           await sql`UPDATE clusters SET name = ${name} WHERE id = ${id} AND org_id = ${org_id}`;
    if (cloud_provider) await sql`UPDATE clusters SET cloud_provider = ${cloud_provider} WHERE id = ${id} AND org_id = ${org_id}`;
    if (k8s_version)    await sql`UPDATE clusters SET k8s_version = ${k8s_version} WHERE id = ${id} AND org_id = ${org_id}`;

    await invalidateCache(`clusters:${org_id}`);
    return { message: "Updated" };
  });

  // PATCH /api/clusters/:id/heartbeat — agent calls this (no auth, uses agent_token)
  app.patch("/:id/heartbeat", async (req) => {
    const { id } = req.params as { id: string };
    const { status, k8s_version, error_message, agent_token } = req.body as any;

    // Verify agent token
    const [cluster] = await sql`SELECT id FROM clusters WHERE id = ${id} AND agent_token = ${agent_token || ""}`;
    if (!cluster) return { message: "Invalid token" };

    await sql`
      UPDATE clusters
      SET status = ${status || "connected"},
          last_seen_at = now(),
          k8s_version = COALESCE(${k8s_version || null}, k8s_version),
          error_message = ${error_message || null}
      WHERE id = ${id}
    `;
    return { message: "Heartbeat recorded" };
  });

  // DELETE /api/clusters/:id — admin only
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM clusters WHERE id = ${id} AND org_id = ${org_id}`;
    await invalidateCache(`clusters:${org_id}`);
    return { message: "Removed" };
  });
}