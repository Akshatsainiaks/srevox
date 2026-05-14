import { FastifyRequest, FastifyReply } from "fastify";

export interface JWTPayload {
  sub:    string;
  org_id: string;
  role:   string;
  email:  string;
}

// Extract JWT payload from request
export function getUser(req: FastifyRequest): JWTPayload {
  return req.user as JWTPayload;
}

// Role hierarchy
const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  member: 2,
  admin:  3,
};

// Require minimum role — use as onRequest hook
export function requireRole(minRole: "viewer" | "member" | "admin") {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as JWTPayload;
    if (!user) return reply.status(401).send({ detail: "Unauthorized" });
    const userRank = ROLE_RANK[user.role] ?? 0;
    const minRank  = ROLE_RANK[minRole]  ?? 99;
    if (userRank < minRank) {
      return reply.status(403).send({
        detail: `Requires ${minRole} role. Your role: ${user.role}`,
      });
    }
  };
}

// Permission matrix
export const CAN = {
  // Incidents
  viewIncidents:      ["viewer", "member", "admin"],
  acknowledgeIncident:["member", "admin"],
  resolveIncident:    ["member", "admin"],
  runDiagnosis:       ["member", "admin"],

  // Clusters
  viewClusters:   ["viewer", "member", "admin"],
  addCluster:     ["admin"],
  deleteCluster:  ["admin"],

  // Channels
  viewChannels:   ["viewer", "member", "admin"],
  addChannel:     ["admin"],
  deleteChannel:  ["admin"],
  testChannel:    ["member", "admin"],

  // Alert Rules
  viewRules:      ["viewer", "member", "admin"],
  addRule:        ["admin"],
  deleteRule:     ["admin"],
  toggleRule:     ["member", "admin"],

  // Team / Users
  viewTeam:       ["member", "admin"],
  inviteUser:     ["admin"],
  removeUser:     ["admin"],
  changeRole:     ["admin"],
};

export function hasPermission(role: string, action: keyof typeof CAN): boolean {
  return CAN[action]?.includes(role) ?? false;
}