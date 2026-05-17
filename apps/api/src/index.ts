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

async function seedDefaults() {
  try {
    const [existing] = await sql`
      SELECT id FROM users WHERE email = 'admin@srevox.local' LIMIT 1
    `;
    if (!existing) {
      const hashed = await bcrypt.hash("admin123", 12);
      await sql`
        INSERT INTO users (id, org_id, email, hashed_password, full_name, role)
        VALUES (
          '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          'admin@srevox.local', ${hashed}, 'Admin User', 'admin'
        ) ON CONFLICT DO NOTHING
      `;
      console.log("✅ Default admin: admin@srevox.local / admin123");
    }
  } catch (err) {
    console.warn("[seed] skipped:", err);
  }
}

  const PORT = Number(process.env.API_PORT || 4000);
  try {
    await seedDefaults();
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Srevox API running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();