import { FastifyInstance } from "fastify";
import { genId } from "../utils/id.js";
import sql from "../db/sql.js";
import { encrypt, decrypt } from "../services/crypto.js";
import { getUser, requireRole } from "../middleware/rbac.js";
import axios from "axios";

export default async function channelRoutes(app: FastifyInstance) {

  // GET /api/channels — all roles
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const channels = await sql`
      SELECT id, name, type, enabled, last_success_at, last_error, created_at
      FROM channels
      WHERE org_id = ${org_id}
      ORDER BY created_at DESC
    `;
    return { channels };
  });

  // POST /api/channels — admin only
  app.post("/", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { name, type, config } = req.body as any;
    if (!name || !type || !config)
      return reply.status(400).send({ detail: "name, type and config required" });

    const id = genId("chn");
    await sql`
      INSERT INTO channels (id, org_id, name, type, config_encrypted)
      VALUES (${id}, ${org_id}, ${name}, ${type}, ${encrypt(JSON.stringify(config))})
    `;
    return { id, name, type, enabled: true };
  });

  // PATCH /api/channels/:id/toggle — admin only
  app.patch("/:id/toggle", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`UPDATE channels SET enabled = NOT enabled WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Toggled" };
  });

  // POST /api/channels/:id/test — member+
  app.post("/:id/test", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const [channel] = await sql`SELECT * FROM channels WHERE id = ${id} AND org_id = ${org_id}`;
    if (!channel) return reply.status(404).send({ detail: "Not found" });

    let config: Record<string, string> = {};
    try { config = JSON.parse(decrypt(channel.config_encrypted)); } catch { config = {}; }

    try {
      const res = await axios.post(
        `${process.env.ALERT_WORKER_URL || "http://srevox-worker:3001"}/test`,
        { type: channel.type, config, test_message: { pod_name: "test-pod-srevox", namespace: "production", crash_reason: "OOMKilled", severity: "critical" } },
        { timeout: 15000 }
      );
      await sql`UPDATE channels SET last_success_at = now(), last_error = null WHERE id = ${id}`;
      return { message: "Test sent", result: res.data };
    } catch (err: any) {
      const msg = err.message;
      await sql`UPDATE channels SET last_error = ${msg} WHERE id = ${id}`;
      return reply.status(502).send({ detail: `Test failed: ${msg}` });
    }
  });

  // DELETE /api/channels/:id — admin only
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM channels WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Deleted" };
  });
}