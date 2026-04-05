'use strict';

const {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  softDeleteRecord,
  getSummary,
  getCategoryTotals,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentRecords,
} = require('../models/record.model');

/* ── CRUD ───────────────────────────────────────────────────────────────── */

function listRecords(filters) {
  const { rows, total, page, limit } = getAllRecords(filters);
  return {
    records: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function getRecord(id) {
  const record = getRecordById(id);
  if (!record) {
    const err = new Error('Financial record not found.');
    err.statusCode = 404;
    throw err;
  }
  return record;
}

function addRecord(data) {
  return createRecord(data);
}

function editRecord(id, updates) {
  const existing = getRecordById(id);
  if (!existing) {
    const err = new Error('Financial record not found.');
    err.statusCode = 404;
    throw err;
  }
  return updateRecord(id, updates);
}

function removeRecord(id) {
  const existing = getRecordById(id);
  if (!existing) {
    const err = new Error('Financial record not found.');
    err.statusCode = 404;
    throw err;
  }
  const result = softDeleteRecord(id);
  if (result.changes === 0) {
    const err = new Error('Record could not be deleted.');
    err.statusCode = 500;
    throw err;
  }
}

/* ── Dashboard / Analytics ──────────────────────────────────────────────── */

function getDashboardSummary() {
  return getSummary();
}

function getByCategoryBreakdown() {
  const rows = getCategoryTotals();

  // Structure: { income: [...], expense: [...] }
  const result = { income: [], expense: [] };
  rows.forEach((r) => {
    result[r.type]?.push({
      category:     r.category,
      record_count: r.record_count,
      total_amount: r.total_amount,
    });
  });
  return result;
}

function getTrends(period = 'monthly', count) {
  if (period === 'weekly') {
    const weeks = count ? parseInt(count) : 8;
    return getWeeklyTrends(weeks);
  }
  const months = count ? parseInt(count) : 12;
  return getMonthlyTrends(months);
}

function getRecentActivity(limit = 10) {
  return getRecentRecords(Math.min(Number(limit), 50));
}

module.exports = {
  listRecords,
  getRecord,
  addRecord,
  editRecord,
  removeRecord,
  getDashboardSummary,
  getByCategoryBreakdown,
  getTrends,
  getRecentActivity,
};
