/**
 * Srevox Alert Worker v2
 * Pipeline: Redis crash event → rule match → noise filter →
 *           service owner routing → user preference filter → send alerts
 */
import "dotenv/config";
import Redis from "ioredis";
import { Pool } from "pg";
import Fastify from "fastify";
import { createDecipheriv, createHash } from "crypto";
import type { CrashEvent, ChannelConfig } from "./types.js";
import { sendEmail }                        from "./senders/email.js";
import { sendTeams, sendWhatsApp, sendWebhook, sendClusterAlert } from "./senders/channels.js";

const db = new Pool({
  host:     process.env.POSTGRES_HOST || "localhost",
  port:     Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB   || "srevox",
  user:     process.env.POSTGRES_USER || "srevox",
  password: process.env.POSTGRES_PASSWORD,
});

const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const cache      = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// ── Test HTTP server ──────────────────────────────────────────────────────────
const server = Fastify({ logger: false });

server.post("/test", async (req, reply) => {
  const { type, config, test_message } = req.body as {
    type: string;
    config: Record<string, string>;
    test_message: Partial<CrashEvent>;
  };
  const testEvent: CrashEvent = {
    cluster_id:     "test-cluster",
    pod_name:       test_message.pod_name    || "test-pod-srevox",
    namespace:      test_message.namespace   || "production",
    container_name: test_message.container_name || "app",
    crash_reason:   test_message.crash_reason   || "OOMKilled",
    restart_count:  test_message.restart_count  || 5,
    pod_labels:     {},
    raw_event:      {},
    detected_at:    new Date().toISOString(),
  };
  try {
    await dispatchAlert({ id: "test", type: type as any, config }, testEvent, "test-incident", "critical", "test-cluster");
    return { success: true, message: "Test alert sent" };
  } catch (err: any) {
    let msg = err.message || "Failed";
    if (err.response?.data) {
      msg = typeof err.response.data === "string" 
        ? err.response.data 
        : (err.response.data.detail || err.response.data.error || JSON.stringify(err.response.data));
    }
    return reply.status(500).send({ success: false, error: msg });
  }
});

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("[alert-worker] 🚀 Starting Srevox alert worker...");
  await server.listen({ port: 3001, host: "0.0.0.0" });
  console.log("[alert-worker] Test server on http://localhost:3002");

  await subscriber.subscribe("srevox:crashes", "srevox:system_alerts", (err) => {
    if (err) { console.error("[alert-worker] Subscribe error:", err); process.exit(1); }
  });

  subscriber.on("message", async (channel: string, message: string) => {
    try {
      if (channel === "srevox:crashes") {
        const event: CrashEvent = JSON.parse(message);
        await processEvent(event);
      } else if (channel === "srevox:system_alerts") {
        const event = JSON.parse(message);
        await processSystemAlert(event);
      }
    } catch (err) {
      console.error(`[alert-worker] Error processing message on channel ${channel}:`, err);
    }
  });

  console.log("[alert-worker] 👂 Waiting for events on srevox:crashes and srevox:system_alerts...");

  // Check cluster heartbeats every 30 seconds
  setInterval(async () => {
    try {
      await checkClusterHeartbeats();
    } catch (err) {
      console.error("[alert-worker] Heartbeat check failed:", err);
    }
  }, 30000);
}

// ── Event pipeline ────────────────────────────────────────────────────────────
async function processEvent(event: CrashEvent): Promise<void> {
  console.log(`[alert-worker] 🔔 ${event.pod_name} (${event.namespace}) — ${event.crash_reason} [${event.restart_count} restarts]`);

  let clusterName = event.cluster_id;
  try {
    const { rows } = await db.query(
      `UPDATE clusters SET status = 'connected', last_seen_at = now() WHERE cluster_id = $1 RETURNING name`,
      [event.cluster_id]
    );
    if (rows[0]?.name) {
      clusterName = rows[0].name;
    }
  } catch (err) {
    console.error("[alert-worker] Failed to update cluster status / fetch name:", err);
  }

  const rules = await getMatchingRules(event);
  if (!rules.length) {
    console.log("[alert-worker] No matching rules — skipping");
    return;
  }

  for (const rule of rules) {
    const imagePullErrors = ["ImagePullBackOff", "ErrImagePull", "InvalidImageName"];
    const skipThreshold = imagePullErrors.includes(event.crash_reason);
    if (!skipThreshold && event.restart_count < rule.min_restarts) {
      console.log(`[alert-worker] Below restart threshold (${event.restart_count} < ${rule.min_restarts})`);
      continue;
    }

    const cooldownKey = `cooldown:${rule.id}:${event.cluster_id}:${event.namespace}:${event.pod_name}`;
    if (await cache.get(cooldownKey)) {
      console.log(`[alert-worker] Cooldown active for ${event.pod_name}`);
      continue;
    }

    const incidentId = await upsertIncident(event, rule);
    if (!incidentId) continue;

    // Rule channels (org-level)
    const ruleChannels = await getChannels(rule.channel_ids);

    // Service owner channels (user-specific routing)
    const { channels: ownerChannels, ownerUserIds } = await getServiceOwnerChannels(
      event.cluster_id, event.namespace, event.pod_name, rule.org_id
    );

    // Merge + deduplicate
    const allChannelMap = new Map<string, ChannelConfig>();
    [...ruleChannels, ...ownerChannels].forEach((ch) => allChannelMap.set(ch.id, ch));

    // Filter by user preferences for owner channels
    const filteredChannels: ChannelConfig[] = [];

    for (const [id, ch] of allChannelMap) {
      // For owner channels — check their personal preferences
      if (ownerChannels.find((oc) => oc.id === id) && ownerUserIds.size > 0) {
        const ownerUserId = ownerChannels.find((oc) => oc.id === id)?.userId;
        if (ownerUserId) {
          const allowed = await checkUserPreferences(ownerUserId, event, rule.severity);
          if (!allowed) {
            console.log(`[alert-worker] User preference filter blocked alert for channel ${ch.type}`);
            continue;
          }
        }
      }
      filteredChannels.push(ch);
    }

    if (!filteredChannels.length) {
      console.log(`[alert-worker] All channels filtered — no alerts sent`);
    }

    const results = await Promise.allSettled(
      filteredChannels.map((ch) => dispatchAlert(ch, event, incidentId, rule.severity, clusterName))
    );

    await logResults(results, filteredChannels, incidentId);
    await cache.set(cooldownKey, "1", "EX", rule.cooldown_minutes * 60);

    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[alert-worker] ✅ Incident ${incidentId.slice(0, 8)} — ${sent}/${filteredChannels.length} channels notified`);
  }
}

// ── User preference check ─────────────────────────────────────────────────────
async function checkUserPreferences(
  userId: string,
  event: CrashEvent,
  severity: string
): Promise<boolean> {
  try {
    const { rows } = await db.query(
      `SELECT * FROM user_alert_preferences WHERE user_id = $1 AND enabled = true`,
      [userId]
    );
    if (!rows.length) return true; // No preferences = receive all

    const pref = rows[0];
    const severities:    string[] = parseJsonArr(pref.severities);
    const crash_reasons: string[] = parseJsonArr(pref.crash_reasons);
    const namespaces:    string[] = parseJsonArr(pref.namespaces);

    // Check severity filter
    if (severities.length && !severities.includes(severity)) {
      console.log(`[alert-worker] User ${userId} filters out severity: ${severity}`);
      return false;
    }

    // Check crash reason filter (empty = all)
    if (crash_reasons.length && !crash_reasons.includes(event.crash_reason)) {
      console.log(`[alert-worker] User ${userId} filters out crash reason: ${event.crash_reason}`);
      return false;
    }

    // Check namespace filter (empty = all)
    if (namespaces.length && !namespaces.includes(event.namespace)) {
      console.log(`[alert-worker] User ${userId} filters out namespace: ${event.namespace}`);
      return false;
    }

    // Check quiet hours (UTC hour)
    if (pref.quiet_hours_start != null && pref.quiet_hours_end != null) {
      const currentHour = new Date().getUTCHours();
      const { quiet_hours_start: start, quiet_hours_end: end } = pref;
      const inQuietHours = start <= end
        ? currentHour >= start && currentHour < end
        : currentHour >= start || currentHour < end; // overnight window

      if (inQuietHours) {
        console.log(`[alert-worker] User ${userId} in quiet hours (${start}:00–${end}:00 UTC)`);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("[alert-worker] Preference check error:", err);
    return true; // Fail open
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
async function dispatchAlert(
  channel: ChannelConfig,
  event: CrashEvent,
  incidentId: string,
  severity: string,
  clusterName: string
): Promise<void> {
  switch (channel.type) {
    case "email":    return sendEmail(channel.config, event, incidentId, severity, clusterName);
    case "teams":    return sendTeams(channel.config, event, incidentId, severity, clusterName);
    case "whatsapp": return sendWhatsApp(channel.config, event, incidentId, severity, clusterName);
    case "webhook":
    case "slack":    return sendWebhook(channel.config, event, incidentId, severity, clusterName);
    default:
      console.warn(`[alert-worker] Unknown channel type: ${channel.type}`);
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────
// ── DB helpers ────────────────────────────────────────────────────────────────
async function getMatchingRules(event: CrashEvent) {
  const { rows } = await db.query(
    `SELECT ar.*, o.org_id
     FROM alert_rules ar
     JOIN clusters c ON ar.cluster_id = c.cluster_id
     JOIN organizations o ON ar.org_id = o.org_id
     WHERE ar.enabled = true
       AND (ar.cluster_id = $1 OR ar.cluster_id IS NULL)`,
    [event.cluster_id]
  );
  return rows.filter((rule) => {
    const reasons:    string[] = parseJsonArr(rule.crash_reasons);
    const namespaces: string[] = parseJsonArr(rule.namespaces);
    const channelIds: string[] = parseJsonArr(rule.channel_ids);
    rule.channel_ids = channelIds;
    return (!reasons.length    || reasons.includes(event.crash_reason)) &&
           (!namespaces.length  || namespaces.includes(event.namespace));
  });
}

async function getServiceOwnerChannels(
  clusterId: string, namespace: string, podName: string, orgId: string
): Promise<{ channels: (ChannelConfig & { userId?: string })[]; ownerUserIds: Set<string> }> {
  const ownerUserIds = new Set<string>();
  try {
    const { rows: owners } = await db.query(
      `SELECT so.channel_ids, so.user_id,
              u.personal_channel_id, u.full_name, u.email
       FROM service_owners so
       LEFT JOIN users u ON so.user_id = u.user_id
       WHERE so.cluster_id = $1 AND so.org_id = $2
         AND (so.namespace IS NULL OR so.namespace = $3)
         AND (so.pod_prefix IS NULL OR $4 LIKE so.pod_prefix || '%')
       ORDER BY
         (CASE WHEN so.pod_prefix IS NOT NULL THEN 2 ELSE 0 END) +
         (CASE WHEN so.namespace  IS NOT NULL THEN 1 ELSE 0 END) DESC
       LIMIT 3`,
      [clusterId, orgId, namespace, podName]
    );

    if (!owners.length) return { channels: [], ownerUserIds };

    const channelIds = new Set<string>();
    const channelUserMap = new Map<string, string>();

    for (const owner of owners) {
      ownerUserIds.add(owner.user_id);
      parseJsonArr(owner.channel_ids).forEach((id: string) => {
        channelIds.add(id);
        channelUserMap.set(id, owner.user_id);
      });
      if (owner.personal_channel_id) {
        channelIds.add(owner.personal_channel_id);
        channelUserMap.set(owner.personal_channel_id, owner.user_id);
      }
      console.log(`[alert-worker] 👤 Owner: ${owner.full_name || owner.email}`);
    }

    // Also notify admins
    const { rows: admins } = await db.query(
      `SELECT personal_channel_id, user_id AS id FROM users
       WHERE org_id = $1 AND role = 'admin' AND personal_channel_id IS NOT NULL`,
      [orgId]
    );
    admins.forEach((a) => {
      channelIds.add(a.personal_channel_id);
      channelUserMap.set(a.personal_channel_id, a.id);
    });

    const rawChannels = await getChannels(Array.from(channelIds));
    const channels = rawChannels.map((ch) => ({
      ...ch,
      userId: channelUserMap.get(ch.id),
    }));

    return { channels, ownerUserIds };
  } catch (err) {
    console.error("[alert-worker] Service owner lookup error:", err);
    return { channels: [], ownerUserIds };
  }
}

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "dev_key_replace_in_production_32c";
  return Buffer.from(createHash("sha256").update(raw).digest());
}

function decrypt(stored: string): string {
  const [ivHex, encHex] = stored.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid encrypted value");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function getChannels(channelIds: string[]): Promise<ChannelConfig[]> {
  if (!channelIds?.length) return [];
  const { rows } = await db.query(
    "SELECT channel_id AS id, type, config_encrypted FROM channels WHERE channel_id = ANY($1) AND enabled = true",
    [channelIds]
  );
  return rows.map((r) => {
    let config: Record<string, string> = {};
    try {
      config = JSON.parse(r.config_encrypted);
    } catch {
      try {
        config = JSON.parse(decrypt(r.config_encrypted));
      } catch (err) {
        console.error(`[alert-worker] Failed to decrypt config for channel ${r.id}:`, err);
        config = {};
      }
    }
    return { id: r.id, type: r.type, config };
  });
}

function genId(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomPart = "";
  for (let i = 0; i < 11; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${randomPart}`;
}

async function upsertIncident(event: CrashEvent, rule: any): Promise<string | null> {
  try {
    const id = genId("inc");
    const { rows } = await db.query(
      `INSERT INTO incidents
         (incident_id, org_id, cluster_id, rule_id, pod_name, namespace, container_name,
          crash_reason, restart_count, exit_code, pod_labels, raw_event, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING incident_id AS id`,
      [
        id,
        rule.org_id, event.cluster_id, rule.id,
        event.pod_name, event.namespace, event.container_name,
        event.crash_reason, event.restart_count, event.exit_code || null,
        JSON.stringify(event.pod_labels),
        JSON.stringify(event),
        rule.severity,
      ]
    );
    return rows[0]?.id || null;
  } catch (err) {
    console.error("[alert-worker] Failed to save incident:", err);
    return null;
  }
}

async function logResults(
  results: PromiseSettledResult<void>[],
  channels: ChannelConfig[],
  incidentId: string
) {
  for (let i = 0; i < results.length; i++) {
    const r  = results[i];
    const ch = channels[i];
    const status = r.status === "fulfilled" ? "sent" : "failed";
    const error  = r.status === "rejected"  ? String(r.reason) : null;
    console.log(`[alert-worker] ${ch.type}: ${status}${error ? " — " + error : ""}`);
    try {
      await db.query(
        `INSERT INTO alerts_sent (alert_sent_id, incident_id, channel_id, channel_type, status, error_message)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [incidentId, ch.id, ch.type, status, error]
      );
      if (status === "sent")
        await db.query(`UPDATE channels SET last_success_at = now() WHERE channel_id = $1`, [ch.id]);
      else
        await db.query(`UPDATE channels SET last_error = $1 WHERE channel_id = $2`, [error, ch.id]);
    } catch {}
  }
}

function parseJsonArr(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
  return [];
}

interface SystemAlertEvent {
  event_type: "cluster_deleted" | "cluster_error" | "cluster_disconnected" | "cluster_connected";
  org_id: string;
  cluster_id: string;
  cluster_name: string;
  details?: string;
}

async function processSystemAlert(event: SystemAlertEvent): Promise<void> {
  console.log(`[alert-worker] [system-alert] ${event.event_type} on cluster ${event.cluster_name}`);

  // Fetch all enabled channels for the organization
  const { rows: channels } = await db.query(
    "SELECT channel_id AS id, type, config_encrypted FROM channels WHERE org_id = $1 AND enabled = true",
    [event.org_id]
  );
  if (!channels.length) {
    console.log(`[alert-worker] [system-alert] No enabled channels for org ${event.org_id} — skipping`);
    return;
  }

  const channelConfigs: ChannelConfig[] = channels.map((r) => {
    let config: Record<string, string> = {};
    try {
      config = JSON.parse(r.config_encrypted);
    } catch {
      try {
        config = JSON.parse(decrypt(r.config_encrypted));
      } catch (err) {
        console.error(`[alert-worker] Failed to decrypt config for channel ${r.id}:`, err);
        config = {};
      }
    }
    return { id: r.id, type: r.type, config };
  });

  const title = getSystemAlertTitle(event.event_type, event.cluster_name);

  const results = await Promise.allSettled(
    channelConfigs.map((ch) =>
      sendClusterAlert(ch, {
        event_type: event.event_type,
        title,
        cluster_name: event.cluster_name,
        details: event.details,
      })
    )
  );

  results.forEach((r, idx) => {
    const ch = channelConfigs[idx];
    if (r.status === "rejected") {
      console.error(`[alert-worker] [system-alert] Failed to notify ${ch.type}:`, r.reason);
    } else {
      console.log(`[alert-worker] [system-alert] Notified ${ch.type} successfully`);
    }
  });
}

function getSystemAlertTitle(eventType: string, clusterName: string): string {
  switch (eventType) {
    case "cluster_deleted":
      return `Cluster '${clusterName}' Deleted`;
    case "cluster_error":
      return `Cluster '${clusterName}' Connection Error`;
    case "cluster_disconnected":
      return `Cluster '${clusterName}' Disconnected`;
    case "cluster_connected":
      return `Cluster '${clusterName}' Reconnected`;
    default:
      return `Cluster Alert on '${clusterName}'`;
  }
}

async function checkClusterHeartbeats(): Promise<void> {
  // Find clusters of type 'agent' in 'connected' or 'pending' state that haven't sent a heartbeat for > 1 minute
  const { rows: timedOutClusters } = await db.query(
    `SELECT cluster_id, org_id, name, status, last_seen_at
     FROM clusters
     WHERE status IN ('connected', 'pending')
       AND connection_type = 'agent'
       AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 minute')`
  );

  for (const cluster of timedOutClusters) {
    console.log(`[heartbeat-check] Cluster '${cluster.name}' (${cluster.cluster_id}) timed out (last seen: ${cluster.last_seen_at})`);
    
    // Update status to 'disconnected'
    await db.query(
      `UPDATE clusters SET status = 'disconnected' WHERE cluster_id = $1`,
      [cluster.cluster_id]
    );

    // Trigger the alert!
    await processSystemAlert({
      event_type: "cluster_disconnected",
      org_id: cluster.org_id,
      cluster_id: cluster.cluster_id,
      cluster_name: cluster.name,
      details: `No heartbeat received since ${cluster.last_seen_at ? new Date(cluster.last_seen_at).toUTCString() : "never"}. Agent is likely down or disconnected.`,
    });
  }
}

process.on("SIGTERM", async () => {
  console.log("[alert-worker] Shutting down...");
  await subscriber.quit();
  await cache.quit();
  await db.end();
  process.exit(0);
});

main().catch((err) => {
  console.error("[alert-worker] Fatal:", err);
  process.exit(1);
});