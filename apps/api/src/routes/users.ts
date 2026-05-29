import { FastifyInstance } from "fastify";
import { genId } from "../utils/id.js";
import bcrypt from "bcryptjs";
import sql from "../db/sql.js";
import { getUser, requireRole } from "../middleware/rbac.js";
import { sendEmail } from "../services/email.js";

export default async function userRoutes(app: FastifyInstance) {

  // GET /api/users — list org members (member+)
  app.get("/", {
    onRequest: [(app as any).authenticate, requireRole("member")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const users = await sql`
      SELECT user_id, email, full_name, role, is_active, created_at, last_login_at
      FROM users
      WHERE org_id = ${org_id} AND is_active = true
      ORDER BY created_at ASC
    `;
    return { users };
  });

  // POST /api/users/create — admin only (direct user creation)
  app.post("/create", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { email, password, full_name, role = "member", send_welcome_email } = req.body as {
      email: string;
      password: string;
      full_name?: string;
      role: string;
      send_welcome_email?: boolean;
    };

    if (!email || !password) return reply.status(400).send({ detail: "Email and password are required" });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return reply.status(400).send({ detail: "Invalid email format" });
    if (password.length < 8) return reply.status(400).send({ detail: "Password must be at least 8 characters" });
    if (!["viewer", "member", "admin"].includes(role)) return reply.status(400).send({ detail: "Invalid role" });

    // Check if user already exists
    const [existing] = await sql`SELECT user_id FROM users WHERE email = ${email}`;
    if (existing) return reply.status(409).send({ detail: "User already exists" });

    const userId = genId("usr");
    const hashed = await bcrypt.hash(password, 12);

    await sql`
      INSERT INTO users (user_id, org_id, email, hashed_password, full_name, role)
      VALUES (${userId}, ${org_id}, ${email}, ${hashed}, ${full_name || ""}, ${role})
    `;

    let preview_url: string | null = null;
    if (send_welcome_email) {
      const emailPreview = await sendEmail(
        email,
        "Welcome to Loopzen!",
        `Hello ${full_name || email},\n\nYou have been invited to Loopzen.\nYour login email: ${email}\nYour temporary password: ${password}\n\nPlease login and change your password.`
      );
      if (typeof emailPreview === "string") preview_url = emailPreview;
    }

    return { message: "User created successfully", user_id: userId, email, role, preview_url };
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
      SELECT user_id FROM users WHERE email = ${email} AND org_id = ${org_id}
    `;
    if (existing) return reply.status(409).send({ detail: "User already in your organization" });

    // Check if invitation already pending
    const [pendingInvite] = await sql`
      SELECT invite_id FROM invitations
      WHERE email = ${email} AND org_id = ${org_id} AND accepted = false
        AND expires_at > now()
    `;
    if (pendingInvite) return reply.status(409).send({ detail: "Invitation already sent" });

    const inviteId = genId("inv");
    const [invite] = await sql`
      INSERT INTO invitations (invite_id, org_id, email, role, invited_by)
      VALUES (${inviteId}, ${org_id}, ${email}, ${role}, ${sub})
      RETURNING invite_id, email, role, token, expires_at
    `;

    // In production, send email with invite link
    // For now return the token so admin can share it
    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/accept-invite?token=${invite.token}`;

    const emailPreview = await sendEmail(
      invite.email,
      "You've been invited to join Loopzen",
      `Hello!\n\nYou've been invited to join an organization on Loopzen as a ${invite.role}.\n\nClick the link below to accept your invitation:\n${inviteUrl}\n\nThis link will expire soon.`
    );

    return {
      message: "Invitation created",
      invite_url: inviteUrl,
      email: invite.email,
      role:  invite.role,
      expires_at: invite.expires_at,
      preview_url: typeof emailPreview === "string" ? emailPreview : null,
    };
  });

  // GET /api/users/invitations — list pending invitations (admin only)
  app.get("/invitations", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req) => {
    const { org_id } = getUser(req);
    const invitations = await sql`
      SELECT i.invite_id, i.email, i.role, i.accepted, i.expires_at, i.created_at,
             u.full_name as invited_by_name
      FROM invitations i
      LEFT JOIN users u ON i.invited_by = u.user_id
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
    await sql`DELETE FROM invitations WHERE invite_id = ${id} AND org_id = ${org_id}`;
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
    const [existingUser] = await sql`SELECT user_id FROM users WHERE email = ${invite.email}`;
    if (existingUser) return reply.status(409).send({ detail: "Email already registered" });

    if (!password || password.length < 8)
      return reply.status(400).send({ detail: "Password must be at least 8 characters" });

    const userId = genId("usr");
    const hashed = await bcrypt.hash(password, 12);

    await sql.begin(async (tx: any) => {
      await tx`
        INSERT INTO users (user_id, org_id, email, hashed_password, full_name, role)
        VALUES (${userId}, ${invite.org_id}, ${invite.email}, ${hashed}, ${full_name || ""}, ${invite.role})
      `;
      await tx`
        UPDATE invitations SET accepted = true WHERE invite_id = ${invite.invite_id}
      `;
    });

    // Auto login
    const jwtToken = await (reply as any).jwtSign(
      { sub: userId, org_id: invite.org_id, role: invite.role, email: invite.email },
      { expiresIn: "24h" }
    );

    return {
      access_token: jwtToken,
      token_type: "bearer",
      user: { user_id: userId, email: invite.email, full_name, role: invite.role },
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

  // Return the updated user so frontend can update localStorage immediately
  const [updated] = await sql`
    UPDATE users SET role = ${role}
    WHERE user_id = ${id} AND org_id = ${org_id}
    RETURNING user_id, email, full_name, role, org_id
  `;
  if (!updated) return reply.status(404).send({ detail: "User not found" });

  return { message: "Role updated", user: updated };
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
      WHERE user_id = ${id} AND org_id = ${org_id}
    `;
    return { message: "User removed from organization" };
  });

  // POST /api/users/:id/reset-password — admin only
  app.post("/:id/reset-password", {
    onRequest: [(app as any).authenticate, requireRole("admin")],
  }, async (req, reply) => {
    const { org_id } = getUser(req);
    const { id } = req.params as { id: string };

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    const newPassword = Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const hashed = await bcrypt.hash(newPassword, 12);

    const [user] = await sql`
      UPDATE users SET hashed_password = ${hashed}
      WHERE user_id = ${id} AND org_id = ${org_id}
      RETURNING email
    `;

    if (!user) return reply.status(404).send({ detail: "User not found" });

    const emailPreview = await sendEmail(
      user.email,
      "Your Loopzen Password Has Been Reset",
      `Hello,\n\nAn administrator has reset your password.\nYour new temporary password is: ${newPassword}\n\nPlease login and change your password immediately.`
    );

    return { message: "Password reset", new_password: newPassword, email: user.email, preview_url: typeof emailPreview === "string" ? emailPreview : null };
  });
}