import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import sql from "../db/sql.js";
import { getUser, requireRole } from "../middleware/rbac.js";

const parseArr = (v: unknown): string[] =>
  typeof v === "string" ? JSON.parse(v) : (Array.isArray(v) ? v : []);

export default async function serviceOwnerRoutes(app: FastifyInstance) {

  // GET /api/service-owners — list all service owners
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const owners = await sql`
      SELECT
        so.*,
        u.full_name  as owner_name,
        u.email      as owner_email,
        c.name       as cluster_name
      FROM service_owners so
      LEFT JOIN users    u ON so.owner_user_id = u.id
      LEFT JOIN clusters c ON so.cluster_id    = c.id
      WHERE so.org_id = ${org_id}
      ORDER BY so.created_at DESC
    `;
    return {
      service_owners: owners.map((o) => ({
        ...o,
        channel_ids: parseArr(o.channel_ids),
      })),
    };
  });

  // POST /api/service-owners — admin only
  app.post("/", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const {
      cluster_id, namespace, pod_prefix,
      owner_user_id, channel_ids = [],
    } = req.body as {
      cluster_id:    string;
      namespace?:    string;
      pod_prefix?:   string;
      owner_user_id: string;
      channel_ids?:  string[];
    };

    if (!cluster_id || !owner_user_id)
      return reply.status(400).send({ detail: "cluster_id and owner_user_id required" });

    // Verify cluster and user belong to this org
    const [cluster] = await sql`SELECT id FROM clusters WHERE id = ${cluster_id} AND org_id = ${org_id}`;
    if (!cluster) return reply.status(404).send({ detail: "Cluster not in your org" });

    const [user] = await sql`SELECT id FROM users WHERE id = ${owner_user_id} AND org_id = ${org_id}`;
    if (!user) return reply.status(404).send({ detail: "User not in your org" });

    const id = randomUUID();
    await sql`
      INSERT INTO service_owners
        (id, org_id, cluster_id, namespace, pod_prefix, owner_user_id, channel_ids)
      VALUES
        (${id}, ${org_id}, ${cluster_id},
         ${namespace || null}, ${pod_prefix || null},
         ${owner_user_id}, ${JSON.stringify(channel_ids)})
    `;
    return { id, message: "Service owner assigned" };
  });

  // DELETE /api/service-owners/:id — admin only
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM service_owners WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Deleted" };
  });

  // GET /api/service-owners/resolve — used by alert worker to find owner for a crash
  // Query: cluster_id + namespace + pod_name
  app.get("/resolve", async (req) => {
    const { cluster_id, namespace, pod_name } = req.query as Record<string, string>;

    const owners = await sql`
      SELECT
        so.*,
        u.email          as owner_email,
        u.full_name      as owner_name,
        u.personal_channel_id
      FROM service_owners so
      LEFT JOIN users u ON so.owner_user_id = u.id
      WHERE so.cluster_id = ${cluster_id}
        AND (so.namespace IS NULL OR so.namespace = ${namespace})
        AND (so.pod_prefix IS NULL OR ${pod_name} LIKE so.pod_prefix || '%')
      ORDER BY
        -- More specific matches first
        (CASE WHEN so.pod_prefix IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN so.namespace  IS NOT NULL THEN 1 ELSE 0 END) DESC
      LIMIT 5
    `;

    return {
      owners: owners.map((o) => ({
        ...o,
        channel_ids: parseArr(o.channel_ids),
      })),
    };
  });
}