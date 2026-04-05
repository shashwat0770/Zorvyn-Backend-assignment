'use strict';

const { getDb } = require('../config/database');

/** Strip password from a user row before returning to client */
function sanitize(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/* ── Queries ────────────────────────────────────────────────────────────── */

function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function getAllUsers({ page = 1, limit = 20, status, role } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (role)   { conditions.push('role = ?');   params.push(role);   }

  const where = conditions.join(' AND ');

  const total = getDb()
    .prepare(`SELECT COUNT(*) as count FROM users WHERE ${where}`)
    .get(...params).count;

  const rows = getDb()
    .prepare(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return { rows, total, page, limit };
}

function createUser({ name, email, password, role = 'viewer' }) {
  const stmt = getDb().prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, email, password, role);
  return getUserById(result.lastInsertRowid);
}

function updateUserRole(id, role) {
  getDb()
    .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .run(role, id);
  return getUserById(id);
}

function updateUserStatus(id, status) {
  getDb()
    .prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);
  return getUserById(id);
}

function deleteUser(id) {
  return getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

module.exports = {
  sanitize,
  getUserById,
  getUserByEmail,
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
