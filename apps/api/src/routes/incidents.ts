import { FastifyInstance } from "fastify";
import { genId } from "../utils/id.js";
import sql from "../db/sql.js";
import { setCache, getCache } from "../db/redis.js";
import { getUser, requireRole } from "../middleware/rbac.js";
import axios from "axios";

export default async function incidentRoutes(app: FastifyInstance) {

  // GET /api/incidents/stats/summary
  app.get("/stats/summary", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { cluster_id } = req.query as { cluster_id?: string };
    
    const cacheKey = cluster_id ? `stats:${org_id}:${cluster_id}` : `stats:${org_id}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')                              AS open_count,
        COUNT(*) FILTER (WHERE status = 'acknowledged')                     AS acknowledged_count,
        COUNT(*) FILTER (WHERE status = 'resolved')                         AS resolved_count,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')   AS critical_open,
        COUNT(*) FILTER (WHERE first_seen_at > now() - interval '24 hours') AS last_24h,
        COUNT(*) FILTER (WHERE first_seen_at > now() - interval '7 days')   AS last_7d,
        COUNT(*) FILTER (WHERE crash_reason = 'OOMKilled')                  AS oom_count,
        COUNT(*) FILTER (WHERE crash_reason = 'CrashLoopBackOff')           AS crash_loop_count
      FROM incidents
      WHERE org_id = ${org_id}
        ${cluster_id ? sql`AND cluster_id = ${cluster_id}` : sql``}
    `;

    const result = {
      open_count:         Number(stats.open_count),
      acknowledged_count: Number(stats.acknowledged_count),
      resolved_count:     Number(stats.resolved_count),
      critical_open:      Number(stats.critical_open),
      last_24h:           Number(stats.last_24h),
      last_7d:            Number(stats.last_7d),
      oom_count:          Number(stats.oom_count),
      crash_loop_count:   Number(stats.crash_loop_count),
    };

    await setCache(cacheKey, result, 30);
    return result;
  });

  // GET /api/incidents
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { status, severity, namespace, cluster_id, limit = "50", offset = "0" } =
      req.query as Record<string, string>;

    const incidents = await sql`
      SELECT i.*, c.name as cluster_name
      FROM incidents i
      LEFT JOIN clusters c ON i.cluster_id = c.cluster_id
      WHERE i.org_id = ${org_id}
        ${status     ? sql`AND i.status = ${status}`           : sql``}
        ${severity   ? sql`AND i.severity = ${severity}`       : sql``}
        ${namespace  ? sql`AND i.namespace = ${namespace}`     : sql``}
        ${cluster_id ? sql`AND i.cluster_id = ${cluster_id}`   : sql``}
      ORDER BY i.first_seen_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM incidents
      WHERE org_id = ${org_id}
        ${status   ? sql`AND status = ${status}`     : sql``}
        ${severity ? sql`AND severity = ${severity}` : sql``}
    `;

    return { incidents, total: Number(count) };
  });

  // GET /api/incidents/trends/daily
  app.get("/trends/daily", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const trends = await sql`
      SELECT
        DATE(first_seen_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'warning')  as warning
      FROM incidents
      WHERE org_id = ${org_id}
        AND first_seen_at > now() - interval '30 days'
      GROUP BY DATE(first_seen_at)
      ORDER BY date ASC
    `;
    return { trends };
  });

  // GET /api/incidents/:id
  app.get("/:id", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    const [incident] = await sql`
      SELECT i.*, c.name as cluster_name
      FROM incidents i
      LEFT JOIN clusters c ON i.cluster_id = c.cluster_id
      WHERE i.incident_id = ${id} AND i.org_id = ${org_id}
    `;
    if (!incident) return reply.status(404).send({ detail: "Incident not found" });
    return incident;
  });

  // POST /api/incidents — internal use by alert worker
  app.post("/", async (req) => {
    const body = req.body as any;
    const id = genId("inc");
    await sql`
      INSERT INTO incidents
        (incident_id, org_id, cluster_id, rule_id, pod_name, namespace, container_name,
         crash_reason, restart_count, exit_code, pod_labels, raw_event, severity)
      VALUES
        (${id}, ${body.org_id || "orgjncj44t4hb4"},
         ${body.cluster_id}, ${body.rule_id || null},
         ${body.pod_name}, ${body.namespace}, ${body.container_name || null},
         ${body.crash_reason}, ${body.restart_count || 0}, ${body.exit_code || null},
         ${JSON.stringify(body.pod_labels || {})},
         ${JSON.stringify(body.raw_event || {})},
         ${body.severity || "warning"})
      ON CONFLICT DO NOTHING
    `;
    return { incident_id: id };
  });

  // PATCH /api/incidents/:id/acknowledge — member+
  app.patch("/:id/acknowledge", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req) => {
    const { org_id, sub } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`
      UPDATE incidents SET status = 'acknowledged', acknowledged_by = ${sub}
      WHERE incident_id = ${id} AND org_id = ${org_id}
    `;
    return { message: "Acknowledged" };
  });

  // PATCH /api/incidents/:id/resolve — member+
  app.patch("/:id/resolve", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req) => {
    const { org_id, sub } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`
      UPDATE incidents SET status = 'resolved', resolved_at = now(), resolved_by = ${sub}
      WHERE incident_id = ${id} AND org_id = ${org_id}
    `;
    return { message: "Resolved" };
  });

  // POST /api/incidents/:id/diagnose — member+
  app.post("/:id/diagnose", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req, reply) => {
    const { org_id, sub } = getUser(req);
    const { id } = req.params as { id: string };
    const [incident] = await sql`
      SELECT * FROM incidents WHERE incident_id = ${id} AND org_id = ${org_id}
    `;
    if (!incident) return reply.status(404).send({ detail: "Not found" });
    if (incident.ai_diagnosis) return { diagnosis: incident.ai_diagnosis, cached: true };

    const [aiSettings] = await sql`
      SELECT provider, model, api_key, ollama_url FROM ai_settings WHERE user_id = ${sub} LIMIT 1
    `;

    const body: Record<string, string> = {};
    if (aiSettings) {
      if (aiSettings.provider)   body.provider   = aiSettings.provider;
      if (aiSettings.model)      body.model      = aiSettings.model;
      if (aiSettings.api_key)    body.api_key    = aiSettings.api_key;
      if (aiSettings.ollama_url) body.ollama_url = aiSettings.ollama_url;
    }

    try {
      const res = await axios.post(
        `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/api/diagnose/${id}`,
        body, { timeout: 60000 }
      );
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
      return reply.status(502).send({ detail: `AI service unavailable: ${msg}` });
    }
  });

  // DELETE /api/incidents/:id — member+
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`
      DELETE FROM incidents WHERE incident_id = ${id} AND org_id = ${org_id}
    `;
    return { message: "Deleted" };
  });

  // POST /api/incidents/bulk-acknowledge — member+
  app.post("/bulk-acknowledge", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req, reply) => {
    const { org_id, sub } = getUser(req);
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ detail: "ids array required" });
    }
    await sql`
      UPDATE incidents SET status = 'acknowledged', acknowledged_by = ${sub}
      WHERE incident_id IN ${sql(ids)} AND org_id = ${org_id}
    `;
    return { message: "Bulk Acknowledged" };
  });

  // POST /api/incidents/bulk-resolve — member+
  app.post("/bulk-resolve", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req, reply) => {
    const { org_id, sub } = getUser(req);
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ detail: "ids array required" });
    }
    await sql`
      UPDATE incidents SET status = 'resolved', resolved_at = now(), resolved_by = ${sub}
      WHERE incident_id IN ${sql(ids)} AND org_id = ${org_id}
    `;
    return { message: "Bulk Resolved" };
  });

  // POST /api/incidents/bulk-delete — member+
  app.post("/bulk-delete", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ detail: "ids array required" });
    }
    await sql`
      DELETE FROM incidents WHERE incident_id IN ${sql(ids)} AND org_id = ${org_id}
    `;
    return { message: "Bulk Deleted" };
  });
}