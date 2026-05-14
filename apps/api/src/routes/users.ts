import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import sql from "../db/sql.js";
import { getUser, requireRole } from "../middleware/rbac.js";

export default async function userRoutes(app: FastifyInstance) {

  // GET /api/users — list org members (member+)
  app.get("/", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const users = await sql`
      SELECT id, email, full_name, role, is_active, created_at, last_login_at
      FROM users
      WHERE org_id = ${org_id}
      ORDER BY created_at ASC
    `;
    return { users };
  });

  // POST /api/users/invite — admin only
  app.post("/invite", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id, sub } = getUser(req);
    const { email, role = "member" } = req.body as { email: string; role: string };

    if (!email) return reply.status(400).send({ detail: "Email is required" });
    if (!["viewer", "member", "admin"].includes(role))
      return reply.status(400).send({ detail: "Invalid role" });

    // Check if user already exists in org
    const [existing] = await sql`
      SELECT id FROM users WHERE email = ${email} AND org_id = ${org_id}
    `;
    if (existing) return reply.status(409).send({ detail: "User already in your organization" });

    // Check if invitation already pending
    const [pendingInvite] = await sql`
      SELECT id FROM invitations
      WHERE email = ${email} AND org_id = ${org_id} AND accepted = false
        AND expires_at > now()
    `;
    if (pendingInvite) return reply.status(409).send({ detail: "Invitation already sent" });

    const inviteId = randomUUID();
    const [invite] = await sql`
      INSERT INTO invitations (id, org_id, email, role, invited_by)
      VALUES (${inviteId}, ${org_id}, ${email}, ${role}, ${sub})
      RETURNING id, email, role, token, expires_at
    `;

    // In production, send email with invite link
    // For now return the token so admin can share it
    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/accept-invite?token=${invite.token}`;

    return {
      message: "Invitation created",
      invite_url: inviteUrl,
      email: invite.email,
      role:  invite.role,
      expires_at: invite.expires_at,
    };
  });

  // GET /api/users/invitations — list pending invitations (admin only)
  app.get("/invitations", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const invitations = await sql`
      SELECT i.id, i.email, i.role, i.accepted, i.expires_at, i.created_at,
             u.full_name as invited_by_name
      FROM invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE i.org_id = ${org_id}
      ORDER BY i.created_at DESC
    `;
    return { invitations };
  });

  // DELETE /api/users/invitations/:id — cancel invitation (admin only)
  app.delete("/invitations/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };
    await sql`DELETE FROM invitations WHERE id = ${id} AND org_id = ${org_id}`;
    return { message: "Invitation cancelled" };
  });

  // POST /api/users/accept-invite — accept invitation (public)
  app.post("/accept-invite", async (req, reply) => {
    const { token, password, full_name } = req.body as {
      token: string;
      password: string;
      full_name?: string;
    };

    const [invite] = await sql`
      SELECT * FROM invitations
      WHERE token = ${token} AND accepted = false AND expires_at > now()
    `;
    if (!invite) return reply.status(400).send({ detail: "Invalid or expired invitation" });

    // Check if email already registered
    const [existingUser] = await sql`SELECT id FROM users WHERE email = ${invite.email}`;
    if (existingUser) return reply.status(409).send({ detail: "Email already registered" });

    if (!password || password.length < 8)
      return reply.status(400).send({ detail: "Password must be at least 8 characters" });

    const userId = randomUUID();
    const hashed = await bcrypt.hash(password, 12);

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO users (id, org_id, email, hashed_password, full_name, role)
        VALUES (${userId}, ${invite.org_id}, ${invite.email}, ${hashed}, ${full_name || ""}, ${invite.role})
      `;
      await tx`
        UPDATE invitations SET accepted = true WHERE id = ${invite.id}
      `;
    });

    // Auto login
    const jwtToken = await reply.jwtSign(
      { sub: userId, org_id: invite.org_id, role: invite.role, email: invite.email },
      { expiresIn: "24h" }
    );

    return {
      access_token: jwtToken,
      token_type: "bearer",
      user: { id: userId, email: invite.email, full_name, role: invite.role },
    };
  });

  // PATCH /api/users/:id/role — change role (admin only, cannot change own role)
  app.patch("/:id/role", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id, sub } = getUser(req);
    const { id } = req.params as { id: string };
    const { role } = req.body as { role: string };

    if (id === sub) return reply.status(400).send({ detail: "Cannot change your own role" });
    if (!["viewer", "member", "admin"].includes(role))
      return reply.status(400).send({ detail: "Invalid role" });

    await sql`
      UPDATE users SET role = ${role}
      WHERE id = ${id} AND org_id = ${org_id}
    `;
    return { message: "Role updated" };
  });

  // DELETE /api/users/:id — remove from org (admin only, cannot remove self)
  app.delete("/:id", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id, sub } = getUser(req);
    const { id } = req.params as { id: string };

    if (id === sub) return reply.status(400).send({ detail: "Cannot remove yourself" });

    await sql`
      UPDATE users SET is_active = false
      WHERE id = ${id} AND org_id = ${org_id}
    `;
    return { message: "User removed from organization" };
  });
}