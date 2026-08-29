import { getSql, ensureSchema, verifyPass } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await ensureSchema();
    const { username, password } = await req.json();
    if (!username || !password) return Response.json({ ok: false, error: "Completá usuario y clave." }, { status: 400 });
    const sql = getSql();
    const rows = await sql`SELECT username, salt, hash, data FROM users WHERE username = ${username}`;
    if (!rows.length || !verifyPass(password, rows[0].salt, rows[0].hash)) {
      return Response.json({ ok: false, error: "Usuario o clave incorrectos." }, { status: 401 });
    }
    return Response.json({ ok: true, username: rows[0].username, data: rows[0].data });
  } catch (e) {
    return Response.json({ ok: false, error: "Error de servidor: " + (e.message || e) }, { status: 500 });
  }
}
