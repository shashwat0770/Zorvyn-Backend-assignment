'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db;

/**
 * Initialize SQLite database, run migrations, and seed the admin user.
 */
function initDatabase() {
  const dbPath = process.env.DB_PATH || './data/finance.db';
  const resolvedPath = path.resolve(dbPath);
  const dir = path.dirname(resolvedPath);

  // Ensure the data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations();
  seedAdmin();

  console.log(`✅  SQLite connected → ${resolvedPath}`);
  return db;
}

function runMigrations() {
  db.exec(`
    -- ── Users ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL DEFAULT 'viewer'
                          CHECK(role IN ('viewer', 'analyst', 'admin')),
      status      TEXT    NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active', 'inactive')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Financial Records ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS financial_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      amount      INTEGER NOT NULL,           -- stored in cents (e.g. 10050 = $100.50)
      type        TEXT    NOT NULL
                          CHECK(type IN ('income', 'expense')),
      category    TEXT    NOT NULL,
      date        TEXT    NOT NULL,           -- ISO 8601 date string YYYY-MM-DD
      notes       TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      deleted_at  TEXT,                       -- soft-delete timestamp
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Indexes ─────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_records_type       ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_records_category   ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_records_date       ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON financial_records(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
  `);
}

function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@zorvyn.com';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const name = process.env.ADMIN_NAME || 'Super Admin';
    const hash = bcrypt.hashSync(password, 12);

    db.prepare(`
      INSERT INTO users (name, email, password, role, status)
      VALUES (?, ?, ?, 'admin', 'active')
    `).run(name, email, hash);

    console.log(`🌱  Admin seeded → email: ${email}  password: ${password}`);
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDatabase() first.');
  return db;
}

module.exports = { initDatabase, getDb };
