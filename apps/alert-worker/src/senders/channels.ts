import axios from "axios";
import type { CrashEvent } from "../types.js";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "attention",
  warning:  "warning",
  info:     "accent",
};

// ── Microsoft Teams ───────────────────────────────────────────────────────────
export async function sendTeams(
  config: Record<string, string>,
  event: CrashEvent,
  incidentId: string,
  severity: string
): Promise<void> {
  const color       = SEVERITY_COLORS[severity] || "warning";
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/incidents/${incidentId}`;

  const card = {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "TextBlock",
            text: `🔔 Loopzen — Pod Crash (${severity.toUpperCase()})`,
            weight: "Bolder",
            size: "Medium",
            color,
          },
          {
            type: "FactSet",
            facts: [
              { title: "Pod",       value: event.pod_name },
              { title: "Namespace", value: event.namespace },
              { title: "Container", value: event.container_name || "—" },
              { title: "Reason",    value: event.crash_reason },
              { title: "Restarts",  value: String(event.restart_count) },
              { title: "Detected",  value: new Date(event.detected_at).toUTCString() },
            ],
          },
        ],
        actions: [{
          type: "Action.OpenUrl",
          title: "View Incident & AI Diagnosis",
          url: dashboardUrl,
        }],
      },
    }],
  };

  await axios.post(config.webhook_url, card, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
  console.log(`[teams] Adaptive card sent`);
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────
export async function sendWhatsApp(
  config: Record<string, string>,
  event: CrashEvent,
  incidentId: string,
  severity: string
): Promise<void> {
  const emoji = severity === "critical" ? "🔴" : severity === "warning" ? "🟡" : "🔵";
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/incidents/${incidentId}`;

  const message = [
    `${emoji} *Loopzen Alert — ${severity.toUpperCase()}*`,
    ``,
    `*Pod:* ${event.pod_name}`,
    `*Namespace:* ${event.namespace}`,
    `*Reason:* ${event.crash_reason}`,
    `*Restarts:* ${event.restart_count}`,
    ``,
    `View incident: ${dashboardUrl}`,
  ].join("\n");

  if (config.provider === "meta") {
    await sendViaMetaWhatsApp(config, message);
  } else {
    await sendViaTwilio(config, message);
  }
}

async function sendViaTwilio(config: Record<string, string>, message: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Messages.json`;
  const recipients = config.to.split(",").map((t) => t.trim());

  for (const to of recipients) {
    const params = new URLSearchParams({
      From: config.from.startsWith("whatsapp:") ? config.from : `whatsapp:${config.from}`,
      To:   to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      Body: message,
    });
    await axios.post(url, params.toString(), {
      auth: { username: config.account_sid, password: config.auth_token },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });
    console.log(`[whatsapp/twilio] Sent to ${to}`);
  }
}

async function sendViaMetaWhatsApp(config: Record<string, string>, message: string): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;
  const recipients = config.to.split(",").map((t) => t.trim());

  for (const to of recipients) {
    await axios.post(url, {
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "text",
      text: { body: message },
    }, {
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      timeout: 10000,
    });
    console.log(`[whatsapp/meta] Sent to ${to}`);
  }
}

// ── Generic Webhook (Slack, PagerDuty, etc.) ──────────────────────────────────
export async function sendWebhook(
  config: Record<string, string>,
  event: CrashEvent,
  incidentId: string,
  severity: string
): Promise<void> {
  const import_crypto = await import("crypto");
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/incidents/${incidentId}`;

  const payload = {
    source:       "loopzen",
    incident_id:  incidentId,
    severity,
    cluster_id:   event.cluster_id,
    pod_name:     event.pod_name,
    namespace:    event.namespace,
    container:    event.container_name,
    crash_reason: event.crash_reason,
    restarts:     event.restart_count,
    detected_at:  event.detected_at,
    dashboard_url: dashboardUrl,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent":   "Loopzen/1.0",
  };

  if (config.secret) {
    const sig = import_crypto.createHmac("sha256", config.secret)
      .update(JSON.stringify(payload)).digest("hex");
    headers["X-Loopzen-Signature"] = `sha256=${sig}`;
  }

  await axios.post(config.url, payload, { headers, timeout: 10000 });
  console.log(`[webhook] Sent to ${config.url}`);
}
