import { Pool } from "pg";
import { PRODUCTS } from "./products";

// Postgres (Neon) persistence. DATABASE_URL is provided by the Vercel/Neon
// integration in every environment (dev/preview/prod each get their own
// branch); locally it comes from `.env.local` via `vercel env pull`.
function getConnectionString(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local` to fetch it.");
  }
  return value;
}
const connectionString = getConnectionString();

declare global {
  var __trailheadPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
}

// Reuse a single pool across hot-reloads in dev.
export const pool = global.__trailheadPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__trailheadPool = pool;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureReady();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  experience_level TEXT,
  goals TEXT,
  season TEXT,
  suggested_plan TEXT,
  plan TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  trial_started_at TEXT,
  trial_ends_at TEXT,
  onboarding_completed_at TEXT,
  converted_at TEXT,
  canceled_at TEXT,
  paused_until TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  had_failed_attempt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  attempt_number INTEGER NOT NULL,
  card_last4 TEXT NOT NULL,
  status TEXT NOT NULL,
  failure_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  seq BIGSERIAL PRIMARY KEY,
  id TEXT UNIQUE NOT NULL,
  event_name TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  properties TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export { PRODUCTS };

async function seedProducts() {
  const values = PRODUCTS.map(
    (_, i) =>
      `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
  ).join(", ");
  const params = PRODUCTS.flatMap((p) => [
    p.id,
    p.slug,
    p.name,
    p.description,
    p.priceCents,
    p.category,
  ]);
  // Uses the raw pool, not query()/queryOne(), since this runs from inside
  // ensureReady() itself -- routing through query() would re-enter
  // ensureReady() and deadlock on its own in-flight promise.
  await pool.query(
    `INSERT INTO products (id, slug, name, description, price_cents, category)
     VALUES ${values}
     ON CONFLICT (id) DO NOTHING`,
    params
  );
}

let initialized: Promise<void> | undefined;

/** Ensures schema + seed data exist. Safe to call repeatedly (idempotent). */
export function ensureReady(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      await pool.query(SCHEMA_SQL);
      await seedProducts();
    })();
  }
  return initialized;
}

/** Wipes all rows. Test/dev only — gated by caller. */
export async function resetDatabase() {
  await ensureReady();
  await pool.query(`
    DELETE FROM events;
    DELETE FROM payment_attempts;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM users;
  `);
  await seedProducts();
}
