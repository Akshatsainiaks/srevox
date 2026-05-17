import type { FastifyInstance } from "fastify";
import sql from "../db/sql.js";
import { getUser } from "../middleware/rbac.js";

export default async function aiSettingsRoutes(app: FastifyInstance) {

  app.get("/", {
    onRequest: [(app as any).authenticate],
  }, async (req) => {
    const { sub: user_id } = getUser(req);
    const [row] = await sql`
      SELECT * FROM ai_settings WHERE user_id = ${user_id} LIMIT 1
    `;
    if (!row) return {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      api_key: "",
      ollama_url: "http://localhost:11434",
    };
    return {
      provider: row.provider,
      model: row.model,
      api_key: row.api_key ? "••••••••" : "",
      ollama_url: row.ollama_url || "",
    };
  });

  app.post("/", {
    onRequest: [(app as any).authenticate],
  }, async (req) => {
    const { sub: user_id } = getUser(req);
    const { provider, model, api_key, ollama_url } = req.body as any;
    await sql`
      INSERT INTO ai_settings (user_id, provider, model, api_key, ollama_url)
      VALUES (${user_id}, ${provider}, ${model}, ${api_key}, ${ollama_url})
      ON CONFLICT (user_id)
      DO UPDATE SET
        provider   = EXCLUDED.provider,
        model      = EXCLUDED.model,
        api_key    = CASE WHEN EXCLUDED.api_key = 'REMOVE' THEN '' WHEN EXCLUDED.api_key = '' THEN ai_settings.api_key ELSE EXCLUDED.api_key END,
        ollama_url = EXCLUDED.ollama_url,
        updated_at = now()
    `;

    // Push to AI service
    try {
      await fetch(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, api_key, ollama_url }),
      });
    } catch {}

    return { success: true };
  });
}
