import { FastifyInstance } from "fastify";
import sql from "../db/sql.js";
import { getUser } from "../middleware/rbac.js";

export default async function resourceAlertRoutes(app: FastifyInstance) {
  app.get("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { cluster_id } = req.query as { cluster_id?: string };
    const alerts = cluster_id
      ? await sql`SELECT * FROM resource_alerts WHERE org_id = ${org_id} AND cluster_id = ${cluster_id} ORDER BY created_at DESC`
      : await sql`SELECT * FROM resource_alerts WHERE org_id = ${org_id} ORDER BY created_at DESC`;
    return { alerts };
  });

  app.post("/", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { cluster_id, resource_type, threshold_pct, target, target_name, severity } = req.body as any;
    const [alert] = await sql`
      INSERT INTO resource_alerts (org_id, cluster_id, resource_type, threshold_pct, target, target_name, severity)
      VALUES (${org_id}, ${cluster_id}, ${resource_type}, ${threshold_pct}, ${target}, ${target_name||null}, ${severity})
      RETURNING *
    `;
    return { alert };
  });

  app.delete("/:id", { onRequest: [(app as any).authenticate] }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM resource_alerts WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Deleted" };
  });
}
