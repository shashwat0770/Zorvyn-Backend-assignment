'use strict';

const { getDb } = require('../config/database');

/* ── Helpers ────────────────────────────────────────────────────────────── */

/** Convert stored cents (integer) to dollars (float) for API responses */
function centsToAmount(row) {
  if (!row) return null;
  return { ...row, amount: row.amount / 100 };
}

function amountToCents(amount) {
  return Math.round(Number(amount) * 100);
}

/* ── Queries ────────────────────────────────────────────────────────────── */

function getRecordById(id) {
  const row = getDb()
    .prepare('SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL')
    .get(id);
  return centsToAmount(row);
}

function getAllRecords({ page = 1, limit = 20, type, category, startDate, endDate, search } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type)      { conditions.push('type = ?');          params.push(type);      }
  if (category)  { conditions.push('category LIKE ?');   params.push(`%${category}%`); }
  if (startDate) { conditions.push('date >= ?');          params.push(startDate); }
  if (endDate)   { conditions.push('date <= ?');          params.push(endDate);   }
  if (search)    {
    conditions.push('(notes LIKE ? OR category LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.join(' AND ');

  const total = getDb()
    .prepare(`SELECT COUNT(*) as count FROM financial_records WHERE ${where}`)
    .get(...params).count;

  const rows = getDb()
    .prepare(
      `SELECT * FROM financial_records WHERE ${where}
       ORDER BY date DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(centsToAmount);

  return { rows, total, page, limit };
}

function createRecord({ amount, type, category, date, notes, created_by }) {
  const stmt = getDb().prepare(`
    INSERT INTO financial_records (amount, type, category, date, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(amountToCents(amount), type, category, date, notes || null, created_by);
  return getRecordById(result.lastInsertRowid);
}

function updateRecord(id, updates) {
  const fields = [];
  const params = [];

  if (updates.amount   !== undefined) { fields.push('amount = ?');   params.push(amountToCents(updates.amount)); }
  if (updates.type     !== undefined) { fields.push('type = ?');     params.push(updates.type);     }
  if (updates.category !== undefined) { fields.push('category = ?'); params.push(updates.category); }
  if (updates.date     !== undefined) { fields.push('date = ?');     params.push(updates.date);     }
  if (updates.notes    !== undefined) { fields.push('notes = ?');    params.push(updates.notes);    }

  if (fields.length === 0) return getRecordById(id);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  getDb()
    .prepare(`UPDATE financial_records SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`)
    .run(...params);

  return getRecordById(id);
}

function softDeleteRecord(id) {
  return getDb()
    .prepare("UPDATE financial_records SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
    .run(id);
}

/* ── Dashboard / Analytics ──────────────────────────────────────────────── */

function getSummary() {
  const row = getDb().prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income_cents,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense_cents,
      COUNT(*) AS total_records
    FROM financial_records
    WHERE deleted_at IS NULL
  `).get();

  return {
    total_income:   row.total_income_cents  / 100,
    total_expense:  row.total_expense_cents / 100,
    net_balance:   (row.total_income_cents - row.total_expense_cents) / 100,
    total_records:  row.total_records,
  };
}

function getCategoryTotals() {
  return getDb().prepare(`
    SELECT
      category,
      type,
      COUNT(*)          AS record_count,
      SUM(amount) / 100.0 AS total_amount
    FROM financial_records
    WHERE deleted_at IS NULL
    GROUP BY category, type
    ORDER BY total_amount DESC
  `).all();
}

function getMonthlyTrends(months = 12) {
  return getDb().prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      type,
      COUNT(*)                AS record_count,
      SUM(amount) / 100.0     AS total_amount
    FROM financial_records
    WHERE deleted_at IS NULL
      AND date >= date('now', ? || ' months')
    GROUP BY month, type
    ORDER BY month ASC
  `).all(`-${months}`);
}

function getWeeklyTrends(weeks = 8) {
  return getDb().prepare(`
    SELECT
      strftime('%Y-W%W', date) AS week,
      type,
      COUNT(*)                  AS record_count,
      SUM(amount) / 100.0       AS total_amount
    FROM financial_records
    WHERE deleted_at IS NULL
      AND date >= date('now', ? || ' days')
    GROUP BY week, type
    ORDER BY week ASC
  `).all(`-${weeks * 7}`);
}

function getRecentRecords(limit = 10) {
  return getDb().prepare(`
    SELECT * FROM financial_records
    WHERE deleted_at IS NULL
    ORDER BY date DESC, created_at DESC
    LIMIT ?
  `).all(limit).map(centsToAmount);
}

module.exports = {
  getRecordById,
  getAllRecords,
  createRecord,
  updateRecord,
  softDeleteRecord,
  getSummary,
  getCategoryTotals,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentRecords,
};
