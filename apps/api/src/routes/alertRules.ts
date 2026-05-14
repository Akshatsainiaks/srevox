import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import sql from "../db/sql.js";
import { getUser, requireRole } from "../middleware/rbac.js";
import { CRASH_REASONS } from "../types/index.js";

const parseArr = (v: unknown): string[] =>
  typeof v === "string" ? JSON.parse(v) : (Array.isArray(v) ? v : []);

export default async function alertRuleRoutes(app: FastifyInstance) {

  // GET /api/alert-rules — all roles
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const rules = await sql`
      SELECT ar.*, c.name as cluster_name
      FROM alert_rules ar
      LEFT JOIN clusters c ON ar.cluster_id = c.id
      WHERE ar.org_id = ${org_id}
      ORDER BY ar.created_at DESC
    `;
    return {
      rules: rules.map((r) => ({
        ...r,
        namespaces:    parseArr(r.namespaces),
        crash_reasons: parseArr(r.crash_reasons),
        channel_ids:   parseArr(r.channel_ids),
      })),
    };
  });

  // POST /api/alert-rules — admin only
  app.post("/", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const {
      name, cluster_id, description = "",
      namespaces = [], crash_reasons,
      min_restarts = 3, cooldown_minutes = 15,
      severity = "warning", channel_ids = [],
    } = req.body as any;

    if (!name || !cluster_id)
      return reply.status(400).send({ detail: "name and cluster_id required" });

    // Verify cluster belongs to this org
    const [cluster] = await sql`
      SELECT id FROM clusters WHERE id = ${cluster_id} AND org_id = ${org_id}
    `;
    if (!cluster) return reply.status(404).send({ detail: "Cluster not found in your organization" });

    const id = randomUUID();
    await sql`
      INSERT INTO alert_rules
        (id, org_id, cluster_id, name, description, namespaces,
         crash_reasons, min_restarts, cooldown_minutes, severity, channel_ids)
      VALUES
        (${id}, ${org_id}, ${cluster_id}, ${name}, ${description},
         ${JSON.stringify(namespaces)}, ${JSON.stringify(crash_reasons || CRASH_REASONS)},
         ${min_restarts}, ${cooldown_minutes}, ${severity}, ${JSON.stringify(channel_ids)})
    `;
    return { id, name, severity };
  });

  // PATCH /api/alert-rules/:id/toggle — member+
  app.patch("/:id/toggle", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`UPDATE alert_rules SET enabled = NOT enabled WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Toggled" };
  });

  // PATCH /api/alert-rules/:id — admin only
  app.patch("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;

    if (body.name)             await sql`UPDATE alert_rules SET name = ${body.name as string} WHERE id = ${id} AND org_id = ${org_id}`;
    if (body.min_restarts)     await sql`UPDATE alert_rules SET min_restarts = ${body.min_restarts as number} WHERE id = ${id} AND org_id = ${org_id}`;
    if (body.cooldown_minutes) await sql`UPDATE alert_rules SET cooldown_minutes = ${body.cooldown_minutes as number} WHERE id = ${id} AND org_id = ${org_id}`;
    if (body.severity)         await sql`UPDATE alert_rules SET severity = ${body.severity as string} WHERE id = ${id} AND org_id = ${org_id}`;
    if (body.channel_ids)      await sql`UPDATE alert_rules SET channel_ids = ${JSON.stringify(body.channel_ids)} WHERE id = ${id} AND org_id = ${org_id}`;
    if (body.namespaces)       await sql`UPDATE alert_rules SET namespaces = ${JSON.stringify(body.namespaces)} WHERE id = ${id} AND org_id = ${org_id}`;

    return { message: "Updated" };
  });

  // DELETE /api/alert-rules/:id — admin only
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM alert_rules WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Deleted" };
  });
}