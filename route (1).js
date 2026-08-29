import { getSql, ensureSchema, verifyPass } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await ensureSchema();
    const { username, password, data } = await req.json();
    const sql = getSql();
    const rows = await sql`SELECT salt, hash FROM users WHERE username = ${username}`;
    if (!rows.length || !verifyPass(password, rows[0].salt, rows[0].hash)) {
      return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
    }
    await sql`UPDATE users SET data = ${JSON.stringify(data ?? [])}::jsonb, updated_at = now() WHERE username = ${username}`;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: "Error al guardar: " + (e.message || e) }, { status: 500 });
  }
}
