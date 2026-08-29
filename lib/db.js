import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function dbUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL
  );
}

let _sql = null;
export function getSql() {
  if (!_sql) {
    const url = dbUrl();
    if (!url) throw new Error("No hay variable de conexión a la base de datos.");
    _sql = neon(url);
  }
  return _sql;
}

export function hashPass(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(password), s, 64).toString("hex");
  return { salt: s, hash: h };
}
export function verifyPass(password, salt, hash) {
  try {
    const h = crypto.scryptSync(String(password), salt, 64).toString("hex");
    const a = Buffer.from(h, "hex");
    const b = Buffer.from(hash, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

const SEED = [
  { username: "GabrielB", password: "1234" },
  { username: "HU", password: "12345" },
];

let ready = false;
export async function ensureSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
  if (!ready) {
    for (const u of SEED) {
      const { salt, hash } = hashPass(u.password);
      await sql`INSERT INTO users (username, salt, hash) VALUES (${u.username}, ${salt}, ${hash}) ON CONFLICT (username) DO NOTHING`;
    }
    ready = true;
  }
}
