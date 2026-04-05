'use strict';

const {
  listRecords,
  getRecord,
  addRecord,
  editRecord,
  removeRecord,
  getDashboardSummary,
  getByCategoryBreakdown,
  getTrends,
  getRecentActivity,
} = require('../services/finance.service');
const { sendSuccess } = require('../utils/response');

/* ── Financial Records ──────────────────────────────────────────────────── */

function getRecords(req, res, next) {
  try {
    const {
      page = 1, limit = 20,
      type, category,
      startDate, endDate,
      search,
    } = req.query;

    const result = listRecords({
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      type,
      category,
      startDate,
      endDate,
      search,
    });
    return sendSuccess(res, 200, 'Records retrieved.', result.records, result.meta);
  } catch (err) {
    next(err);
  }
}

function getOneRecord(req, res, next) {
  try {
    const record = getRecord(parseInt(req.params.id));
    return sendSuccess(res, 200, 'Record retrieved.', record);
  } catch (err) {
    next(err);
  }
}

function createRecord(req, res, next) {
  try {
    const record = addRecord({ ...req.body, created_by: req.user.id });
    return sendSuccess(res, 201, 'Financial record created.', record);
  } catch (err) {
    next(err);
  }
}

function updateRecord(req, res, next) {
  try {
    const record = editRecord(parseInt(req.params.id), req.body);
    return sendSuccess(res, 200, 'Financial record updated.', record);
  } catch (err) {
    next(err);
  }
}

function deleteRecord(req, res, next) {
  try {
    removeRecord(parseInt(req.params.id));
    return sendSuccess(res, 200, 'Financial record deleted (soft delete).');
  } catch (err) {
    next(err);
  }
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

function getSummary(req, res, next) {
  try {
    const summary = getDashboardSummary();
    return sendSuccess(res, 200, 'Dashboard summary retrieved.', summary);
  } catch (err) {
    next(err);
  }
}

function getCategoryBreakdown(req, res, next) {
  try {
    const data = getByCategoryBreakdown();
    return sendSuccess(res, 200, 'Category breakdown retrieved.', data);
  } catch (err) {
    next(err);
  }
}

function getTrendData(req, res, next) {
  try {
    const { period = 'monthly', count } = req.query;
    const data = getTrends(period, count);
    return sendSuccess(res, 200, `${period} trends retrieved.`, data);
  } catch (err) {
    next(err);
  }
}

function getRecent(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const data = getRecentActivity(limit);
    return sendSuccess(res, 200, 'Recent activity retrieved.', data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecords,
  getOneRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getSummary,
  getCategoryBreakdown,
  getTrendData,
  getRecent,
};
