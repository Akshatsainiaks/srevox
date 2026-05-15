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
import resourceAlertRoutes  from "./routes/resourceAlerts.js";

const app = Fastify({ logger: { level: "info" } });

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

await app.register(authRoutes,           { prefix: "/api/auth" });
await app.register(clusterRoutes,        { prefix: "/api/clusters" });
await app.register(channelRoutes,        { prefix: "/api/channels" });
await app.register(alertRuleRoutes,      { prefix: "/api/alert-rules" });
await app.register(incidentRoutes,       { prefix: "/api/incidents" });
await app.register(userRoutes,           { prefix: "/api/users" });
await app.register(serviceOwnerRoutes,   { prefix: "/api/service-owners" });
await app.register(preferencesRoutes,    { prefix: "/api/preferences" });
await app.register(infrastructureRoutes, { prefix: "/api/infrastructure" });
await app.register(resourceAlertRoutes,  { prefix: "/api/resource-alerts" });

app.get("/health", async () => ({
  status: "ok", service: "loopzen-api", version: "1.0.0",
  timestamp: new Date().toISOString(),
}));

// ── Auto-create tables on first boot ─────────────────────────
async function initDB() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

    await sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name       TEXT NOT NULL,
        slug       TEXT UNIQUE NOT NULL,
        plan       TEXT DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id              TEXT REFERENCES organizations(id) ON DELETE CASCADE,
        email               TEXT UNIQUE NOT NULL,
        hashed_password     TEXT NOT NULL,
        full_name           TEXT DEFAULT '',
        role                TEXT DEFAULT 'member',
        personal_channel_id TEXT,
        invite_token        TEXT,
        invite_expires_at   TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT now(),
        last_login_at       TIMESTAMPTZ
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS clusters (
        id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id               TEXT REFERENCES organizations(id) ON DELETE CASCADE,
        name                 TEXT NOT NULL,
        connection_type      TEXT NOT NULL,
        kubeconfig_encrypted TEXT,
        agent_token          TEXT UNIQUE,
        api_server_url       TEXT,
        cloud_provider       TEXT DEFAULT 'other',
        k8s_version          TEXT,
        status               TEXT DEFAULT 'pending',
        last_seen_at         TIMESTAMPTZ,
        error_message        TEXT,
        created_at           TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS channels (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id           TEXT REFERENCES organizations(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,
        type             TEXT NOT NULL,
        config_encrypted TEXT NOT NULL,
        enabled          BOOLEAN DEFAULT true,
        last_success_at  TIMESTAMPTZ,
        last_error       TEXT,
        created_at       TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id           TEXT REFERENCES organizations(id) ON DELETE CASCADE,
        cluster_id       TEXT REFERENCES clusters(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,
        description      TEXT DEFAULT '',
        namespaces       JSONB DEFAULT '[]',
        pod_labels       JSONB DEFAULT '{}',
        crash_reasons    JSONB DEFAULT '["CrashLoopBackOff","OOMKilled","Error","BackOff","ImagePullBackOff"]',
        min_restarts     INT DEFAULT 3,
        cooldown_minutes INT DEFAULT 15,
        severity         TEXT DEFAULT 'warning',
        channel_ids      JSONB DEFAULT '[]',
        enabled          BOOLEAN DEFAULT true,
        created_at       TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS incidents (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id          TEXT REFERENCES organizations(id) ON DELETE CASCADE,
        cluster_id      TEXT REFERENCES clusters(id),
        rule_id         TEXT REFERENCES alert_rules(id),
        pod_name        TEXT NOT NULL,
        namespace       TEXT NOT NULL,
        container_name  TEXT,
        crash_reason    TEXT NOT NULL,
        restart_count   INT DEFAULT 0,
        exit_code       INT,
        pod_labels      JSONB DEFAULT '{}',
        raw_event       JSONB DEFAULT '{}',
        severity        TEXT DEFAULT 'warning',
        status          TEXT DEFAULT 'open',
        acknowledged_by TEXT,
        resolved_by     TEXT,
        ai_diagnosis    JSONB,
        ai_diagnosed_at TIMESTAMPTZ,
        first_seen_at   TIMESTAMPTZ DEFAULT now(),
        last_seen_at    TIMESTAMPTZ DEFAULT now(),
        resolved_at     TIMESTAMPTZ
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS alerts_sent (
        id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        incident_id   TEXT REFERENCES incidents(id) ON DELETE CASCADE,
        channel_id    TEXT REFERENCES channels(id),
        channel_type  TEXT NOT NULL,
        status        TEXT NOT NULL,
        error_message TEXT,
        sent_at       TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS activity_log (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id      TEXT,
        user_id     TEXT,
        action      TEXT NOT NULL,
        resource    TEXT,
        resource_id TEXT,
        metadata    JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS service_owners (
        id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id         TEXT REFERENCES organizations(id) ON DELETE CASCADE,
        cluster_id     TEXT REFERENCES clusters(id) ON DELETE CASCADE,
        namespace      TEXT,
        pod_prefix     TEXT,
        owner_user_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
        channel_ids    JSONB DEFAULT '[]',
        created_at     TIMESTAMPTZ DEFAULT now()
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS user_alert_preferences (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id          TEXT REFERENCES users(id) ON DELETE CASCADE,
        enabled          BOOLEAN DEFAULT true,
        severities       JSONB DEFAULT '[]',
        crash_reasons    JSONB DEFAULT '[]',
        namespaces       JSONB DEFAULT '[]',
        quiet_hours_start INT,
        quiet_hours_end   INT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )`;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(org_id, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_cluster    ON incidents(cluster_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_incidents_first_seen ON incidents(first_seen_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_clusters_org         ON clusters(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rules_cluster        ON alert_rules(cluster_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_channels_org         ON channels(org_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_alerts_sent_incident ON alerts_sent(incident_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_org         ON activity_log(org_id, created_at DESC)`;

    // Default org
    await sql`
      INSERT INTO organizations (id, name, slug, plan)
      VALUES ('00000000-0000-0000-0000-000000000001', 'My Organization', 'my-org', 'free')
      ON CONFLICT DO NOTHING`;

    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("❌ Database init failed:", err);
    process.exit(1);
  }
}

// ── Seed default admin ────────────────────────────────────────
async function seedDefaults() {
  try {
    const [existing] = await sql`
      SELECT id FROM users WHERE email = 'admin@loopzen.local' LIMIT 1
    `;
    if (!existing) {
      const hashed = await bcrypt.hash("admin123", 12);
      await sql`
        INSERT INTO users (id, org_id, email, hashed_password, full_name, role)
        VALUES (
          '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          'admin@loopzen.local', ${hashed}, 'Admin User', 'admin'
        ) ON CONFLICT DO NOTHING
      `;
      console.log("✅ Default admin: admin@loopzen.local / admin123");
    }
  } catch (err) {
    console.warn("[seed] skipped:", err);
  }
}

const PORT = Number(process.env.API_PORT || 4000);
try {
  await initDB();
  await seedDefaults();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 Loopzen API running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
