import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { PRODUCTS } from "./products";

// Deterministic, seedable SQLite persistence. One file per environment,
// controlled by TRAILHEAD_DB_PATH so tests/preview can use isolated,
// disposable databases while dev/prod share the default file.
const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "trailhead.db");
const dbPath = process.env.TRAILHEAD_DB_PATH || DEFAULT_DB_PATH;

if (dbPath !== ":memory:") {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

declare global {
  var __trailheadDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(dbPath);
  // next build's data-collection step spins up multiple worker processes
  // that each open this same file; set the busy timeout first so even the
  // initial journal_mode/schema/seed writes wait instead of throwing
  // SQLITE_BUSY when another worker holds the lock.
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// Reuse a single connection across hot-reloads in dev.
export const db = global.__trailheadDb ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  global.__trailheadDb = db;
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
  user_id TEXT,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  had_failed_attempt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  card_last4 TEXT NOT NULL,
  status TEXT NOT NULL,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  properties TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

db.exec(SCHEMA_SQL);

export { PRODUCTS };

function seedProducts() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO products (id, slug, name, description, price_cents, category)
     VALUES (@id, @slug, @name, @description, @priceCents, @category)`
  );
  const insertMany = db.transaction((products: typeof PRODUCTS) => {
    for (const product of products) insert.run(product);
  });
  insertMany(PRODUCTS);
}

seedProducts();

/** Wipes all rows. Test/dev only — gated by caller. */
export function resetDatabase() {
  db.exec(`
    DELETE FROM events;
    DELETE FROM payment_attempts;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM users;
  `);
  seedProducts();
}
