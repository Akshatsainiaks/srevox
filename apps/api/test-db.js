import sql from "./src/db/sql.js";
async function check() {
  const users = await sql`SELECT email, role FROM users`;
  console.log(users);
  process.exit(0);
}
check();
