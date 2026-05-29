import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import formbody from "@fastify/formbody";
import "dotenv/config";

import authRoutes          from "./routes/auth.js";
import clusterRoutes       from "./routes/clusters.js";
import channelRoutes       from "./routes/channels.js";
import alertRuleRoutes     from "./routes/alertRules.js";
import incidentRoutes      from "./routes/incidents.js";
import userRoutes          from "./routes/users.js";
import serviceOwnerRoutes  from "./routes/serviceOwners.js";
import preferencesRoutes   from "./routes/preferences.js";
import sql                 from "./db/sql.js";
import bcrypt              from "bcryptjs";
import infrastructureRoutes from "./routes/infrastructure.js";
import aiSettingsRoutes from './routes/aiSettings.js';
import resourceAlertRoutes  from "./routes/resourceAlerts.js";

const app = Fastify({ logger: { level: "info" } });

async function start() {
  await app.register(cors, {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.FRONTEND_URL || "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(formbody);
await app.register(jwt, {
  secret: process.env.BACKEND_SECRET_KEY || "dev_secret_change_in_production",
});

app.decorate("authenticate", async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ detail: "Unauthorized — please log in" });
  }
});

await app.register(authRoutes,         { prefix: "/api/auth" });
await app.register(clusterRoutes,      { prefix: "/api/clusters" });
await app.register(channelRoutes,      { prefix: "/api/channels" });
await app.register(alertRuleRoutes,    { prefix: "/api/alert-rules" });
await app.register(incidentRoutes,     { prefix: "/api/incidents" });
await app.register(userRoutes,         { prefix: "/api/users" });
await app.register(serviceOwnerRoutes, { prefix: "/api/service-owners" });
await app.register(preferencesRoutes,  { prefix: "/api/preferences" });
await app.register(infrastructureRoutes, { prefix: "/api/infrastructure" });
await app.register(resourceAlertRoutes,  { prefix: "/api/resource-alerts" });
await app.register(aiSettingsRoutes,     { prefix: "/api/ai-settings" });

app.get("/health", async () => ({
  status: "ok", service: "srevox-api", version: "1.0.0",
  timestamp: new Date().toISOString(),
}));


// ── Auto-migration — runs on every startup, safe to re-run ──────────────────
async function runMigrations() {
  try {
    // Helper to rename id to [entity]_id if it exists
    const renameIfIdExists = async (table: string, newCol: string) => {
      try {
        await sql.unsafe(`ALTER TABLE ${table} RENAME COLUMN id TO ${newCol}`);
        console.log(`Renamed column id to ${newCol} in table ${table}`);
      } catch (err: any) {
        // Ignore if 'id' column does not exist or already renamed
      }
    };

    // Helper to rename any column if it exists
    const renameColumnIfExists = async (table: string, oldCol: string, newCol: string) => {
      try {
        await sql.unsafe(`ALTER TABLE ${table} RENAME COLUMN ${oldCol} TO ${newCol}`);
        console.log(`Renamed column ${oldCol} to ${newCol} in table ${table}`);
      } catch (err: any) {
        // Ignore if column does not exist
      }
    };

    await renameIfIdExists("organizations", "org_id");
    await renameIfIdExists("users", "user_id");
    await renameIfIdExists("clusters", "cluster_id");
    await renameIfIdExists("channels", "channel_id");
    await renameIfIdExists("alert_rules", "rule_id");
    await renameIfIdExists("incidents", "incident_id");
    await renameIfIdExists("alerts_sent", "alert_sent_id");
    await renameIfIdExists("activity_log", "activity_log_id");
    await renameIfIdExists("service_owners", "service_owner_id");
    await renameIfIdExists("user_alert_preferences", "preference_id");
    await renameIfIdExists("resource_alerts", "resource_alert_id");
    await renameIfIdExists("invitations", "invite_id");

    await renameColumnIfExists("service_owners", "owner_user_id", "user_id");

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_channel_id TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS org_id TEXT`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS severities JSONB DEFAULT '["critical","warning","info"]'`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS crash_reasons JSONB DEFAULT '[]'`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS namespaces JSONB DEFAULT '[]'`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS notify_resolved BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS notify_acknowledged BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE user_alert_preferences ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE`;
    await sql`
      CREATE TABLE IF NOT EXISTS resource_alerts (
        resource_alert_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id TEXT, cluster_id TEXT, resource_type TEXT NOT NULL,
        threshold_pct INT DEFAULT 80, target TEXT DEFAULT 'all',
        target_name TEXT DEFAULT '', severity TEXT DEFAULT 'warning',
        enabled BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS service_owners (
        service_owner_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id TEXT, cluster_id TEXT, namespace TEXT,
        pod_prefix TEXT, user_id TEXT,
        channel_ids JSONB DEFAULT '[]', channel_id TEXT, created_at TIMESTAMPTZ DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS ai_settings (
        user_id TEXT PRIMARY KEY, provider TEXT DEFAULT 'groq',
        model TEXT DEFAULT 'llama-3.1-8b-instant',
        api_key TEXT DEFAULT '', ollama_url TEXT DEFAULT 'http://localhost:11434',
        updated_at TIMESTAMPTZ DEFAULT now()
      )`;
    await sql`ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_cluster_id_fkey`;
    await sql`ALTER TABLE incidents ADD CONSTRAINT incidents_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES clusters(cluster_id) ON DELETE SET NULL`;
    await sql`ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_rule_id_fkey`;
    await sql`ALTER TABLE incidents ADD CONSTRAINT incidents_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES alert_rules(rule_id) ON DELETE SET NULL`;
    await sql`ALTER TABLE alerts_sent DROP CONSTRAINT IF EXISTS alerts_sent_channel_id_fkey`;
    await sql`ALTER TABLE alerts_sent ADD CONSTRAINT alerts_sent_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE SET NULL`;
    console.log("✅ Migrations complete");
  } catch(e: any) {
    console.error("Migration error:", e.message);
  }
}

async function seedDefaults() {
  try {
    const [existing] = await sql`
      SELECT user_id FROM users WHERE email = 'admin@srevox.local' LIMIT 1
    `;
    if (!existing) {
      const hashed = await bcrypt.hash("admin123", 12);
      await sql`
        INSERT INTO users (user_id, org_id, email, hashed_password, full_name, role)
        VALUES (
          'usrjncj44t4hb4',
          'orgjncj44t4hb4',
          'admin@srevox.local', ${hashed}, 'Admin User', 'admin'
        ) ON CONFLICT DO NOTHING
      `;
      console.log("✅ Default admin: admin@srevox.local / admin123");
    }
    // Seed default catch-all alert rule
    const [existingRule] = await sql`SELECT rule_id FROM alert_rules WHERE name = 'Default — All Crashes' LIMIT 1`;
    if (!existingRule) {
      await sql`
        INSERT INTO alert_rules (rule_id, org_id, cluster_id, name, namespaces, crash_reasons, min_restarts, cooldown_minutes, severity, channel_ids, enabled)
        VALUES (
          'rulejncj44t4hb4',
          'orgjncj44t4hb4',
          NULL,
          'Default — All Crashes',
          '[]', '[]', 0, 5, 'warning', '[]', true
        ) ON CONFLICT DO NOTHING
      `;
      console.log("✅ Default catch-all alert rule created");
    }
  } catch (err) {
    console.warn("[seed] skipped:", err);
  }
}

  const PORT = Number(process.env.API_PORT || 4000);
  try {
    await runMigrations();
  await seedDefaults();
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Srevox API running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();