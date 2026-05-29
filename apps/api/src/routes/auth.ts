import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { genId } from "../utils/id.js";
import sql from "../db/sql.js";
import { setSession, deleteSession } from "../db/redis.js";
import { encrypt } from "../services/crypto.js";

export default async function authRoutes(app: FastifyInstance) {

  // POST /api/auth/signup
  app.post("/signup", async (req, reply) => {
    const { email, password, full_name, org_name } = req.body as {
      email: string; password: string; full_name?: string; org_name?: string;
    };

    if (!email || !password)
      return reply.status(400).send({ detail: "Email and password are required" });
    if (password.length < 8)
      return reply.status(400).send({ detail: "Password must be at least 8 characters" });

    const [existing] = await sql`SELECT user_id FROM users WHERE email = ${email}`;
    if (existing) return reply.status(409).send({ detail: "Email already registered" });

    const userId = genId("usr");
    const orgId  = genId("org");
    const slug   = (org_name || email.split("@")[0]).toLowerCase().replace(/\s+/g, "-") + "-" + orgId.slice(0, 6);
    const hashed = await bcrypt.hash(password, 12);

    await sql.begin(async (tx: any) => {
      await tx`
        INSERT INTO organizations (org_id, name, slug, plan)
        VALUES (${orgId}, ${org_name || "My Organization"}, ${slug}, 'free')
      `;
      await tx`
        INSERT INTO users (user_id, org_id, email, hashed_password, full_name, role)
        VALUES (${userId}, ${orgId}, ${email}, ${hashed}, ${full_name || ""}, 'admin')
      `;
    });

    const token = await reply.jwtSign(
      { sub: userId, org_id: orgId, role: "admin", email },
      { expiresIn: "24h" }
    );
    await setSession(token, { userId, orgId, role: "admin" });

    return {
      access_token: token,
      token_type: "bearer",
      user: { user_id: userId, email, full_name: full_name || "", role: "admin", org_id: orgId },
    };
  });

  // POST /api/auth/token — login
  app.post("/token", async (req, reply) => {
    const { username, password } = req.body as { username: string; password: string };

    const [user] = await sql`
      SELECT user_id, org_id, email, hashed_password, full_name, role
      FROM users
      WHERE email = ${username} AND is_active = true
      LIMIT 1
    `;

    if (!user || !(await bcrypt.compare(password, user.hashed_password)))
      return reply.status(401).send({ detail: "Incorrect email or password" });

    await sql`UPDATE users SET last_login_at = now() WHERE user_id = ${user.user_id}`;

    const token = await reply.jwtSign(
      { sub: user.user_id, org_id: user.org_id, role: user.role, email: user.email },
      { expiresIn: "24h" }
    );
    await setSession(token, { userId: user.user_id, orgId: user.org_id, role: user.role });

    return {
      access_token: token,
      token_type: "bearer",
      user: { user_id: user.user_id, email: user.email, full_name: user.full_name, role: user.role, org_id: user.org_id },
    };
  });

  // POST /api/auth/logout
  app.post("/logout", { onRequest: [(app as any).authenticate] }, async (req) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) await deleteSession(token);
    return { message: "Logged out" };
  });

  // GET /api/auth/me
  app.get("/me", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const payload = req.user as { sub: string };
    const [user] = await sql`
      SELECT user_id, org_id, email, full_name, role, personal_channel_id,
             created_at, last_login_at
      FROM users WHERE user_id = ${payload.sub}
    `;
    if (!user) return reply.status(404).send({ detail: "User not found" });

    // Get org info
    const [org] = await sql`
      SELECT org_id, name, slug, plan FROM organizations WHERE org_id = ${user.org_id}
    `;

    return { ...user, org };
  });

  // PATCH /api/auth/me — update profile + personal channel
  app.patch("/me", { onRequest: [(app as any).authenticate] }, async (req, reply) => {
    const payload = req.user as { sub: string; org_id: string };
    const { full_name, current_password, new_password, personal_channel, org_name } = req.body as {
      full_name?:         string;
      current_password?:  string;
      new_password?:      string;
      personal_channel?:  { type: string; config: Record<string, string>; name: string };
      org_name?:          string;
    };

    if (new_password) {
      if (new_password.length < 8)
        return reply.status(400).send({ detail: "New password must be at least 8 characters" });

      const [user] = await sql`SELECT hashed_password FROM users WHERE user_id = ${payload.sub}`;
      if (!current_password || !(await bcrypt.compare(current_password, user.hashed_password)))
        return reply.status(400).send({ detail: "Current password is incorrect" });

      const hashed = await bcrypt.hash(new_password, 12);
      await sql`UPDATE users SET hashed_password = ${hashed} WHERE user_id = ${payload.sub}`;
    }

    if (full_name !== undefined) {
      await sql`UPDATE users SET full_name = ${full_name} WHERE user_id = ${payload.sub}`;
    }

    if (org_name !== undefined) {
      const [org] = await sql`SELECT name FROM organizations WHERE org_id = ${payload.org_id}`;
      if (org && org.name !== org_name) {
        const [{ count }] = await sql`
          SELECT count(*) FROM activity_log 
          WHERE org_id = ${payload.org_id} 
            AND action = 'org_name_change' 
            AND created_at > now() - interval '1 month'
        `;
        if (Number(count) >= 2) {
          return reply.status(429).send({ detail: "Organization name can only be changed 2 times per month" });
        }

        await sql`UPDATE organizations SET name = ${org_name} WHERE org_id = ${payload.org_id}`;
        
        await sql`
          INSERT INTO activity_log (org_id, user_id, action, metadata)
          VALUES (${payload.org_id}, ${payload.sub}, 'org_name_change', ${JSON.stringify({ old: org.name, new: org_name })})
        `;
      }
    }

    // Save personal alert channel
    if (personal_channel) {
      const channelId = genId("chn");
      const configEncrypted = encrypt(JSON.stringify(personal_channel.config));

      // Delete old personal channel if exists
      const [existingUser] = await sql`SELECT personal_channel_id FROM users WHERE user_id = ${payload.sub}`;
      if (existingUser?.personal_channel_id) {
        await sql`DELETE FROM channels WHERE channel_id = ${existingUser.personal_channel_id}`;
      }

      await sql`
        INSERT INTO channels (channel_id, org_id, name, type, config_encrypted)
        VALUES (${channelId}, ${payload.org_id}, ${personal_channel.name}, ${personal_channel.type}, ${configEncrypted})
      `;
      await sql`
        UPDATE users SET personal_channel_id = ${channelId} WHERE user_id = ${payload.sub}
      `;
      return { message: "Profile and personal channel updated", personal_channel_id: channelId };
    }

    return { message: "Profile updated" };
  });

  // GET /api/auth/me/personal-channel
  app.get("/me/personal-channel", { onRequest: [(app as any).authenticate] }, async (req) => {
    const payload = req.user as { sub: string };
    const [user] = await sql`
      SELECT personal_channel_id FROM users WHERE user_id = ${payload.sub}
    `;

    if (!user?.personal_channel_id) return { channel: null };

    const [channel] = await sql`
      SELECT channel_id, name, type, enabled, last_success_at, last_error
      FROM channels WHERE channel_id = ${user.personal_channel_id}
    `;
    return { channel: channel || null };
  });
}