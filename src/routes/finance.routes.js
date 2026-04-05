'use strict';

const { Router } = require('express');
const { z } = require('zod');
const {
  getRecords,
  getOneRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getSummary,
  getCategoryBreakdown,
  getTrendData,
  getRecent,
} = require('../controllers/finance.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = Router();

/* ── Validation Schemas ─────────────────────────────────────────────────── */

const createRecordSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number.' })
    .positive('Amount must be a positive number.')
    .max(999_999_999, 'Amount is too large.'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Type must be 'income' or 'expense'." }),
  }),
  category: z
    .string()
    .min(1, 'Category is required.')
    .max(100, 'Category must be at most 100 characters.'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  notes: z.string().max(500, 'Notes must be at most 500 characters.').optional(),
});

const updateRecordSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number.' })
    .positive('Amount must be a positive number.')
    .max(999_999_999, 'Amount is too large.')
    .optional(),
  type: z
    .enum(['income', 'expense'], {
      errorMap: () => ({ message: "Type must be 'income' or 'expense'." }),
    })
    .optional(),
  category: z
    .string()
    .min(1, 'Category is required.')
    .max(100)
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update.' }
);

/* ── All routes require authentication ──────────────────────────────────── */
router.use(authenticateToken);

/* ── Financial Records ──────────────────────────────────────────────────── */

/**
 * @openapi
 * /api/records:
 *   get:
 *     tags: [Financial Records]
 *     summary: List financial records with optional filters and pagination
 *     description: Accessible by viewer, analyst, and admin roles.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *         description: Records per page (max 100)
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category (partial match)
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter records on or after this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter records on or before this date (YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Full-text search across notes and category
 *     responses:
 *       200:
 *         description: Paginated list of financial records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FinancialRecord'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     totalPages: { type: integer }
 */
router.get('/', requireMinRole('viewer'), getRecords);

/**
 * @openapi
 * /api/records/{id}:
 *   get:
 *     tags: [Financial Records]
 *     summary: Get a single financial record by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Record retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialRecord'
 *       404:
 *         description: Record not found
 */
router.get('/:id', requireMinRole('viewer'), getOneRecord);

/**
 * @openapi
 * /api/records:
 *   post:
 *     tags: [Financial Records]
 *     summary: Create a new financial record (analyst and admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecordRequest'
 *     responses:
 *       201:
 *         description: Record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialRecord'
 *       403:
 *         description: Insufficient permissions (viewer role)
 *       422:
 *         description: Validation error
 */
router.post('/', requireMinRole('analyst'), validate(createRecordSchema), createRecord);

/**
 * @openapi
 * /api/records/{id}:
 *   patch:
 *     tags: [Financial Records]
 *     summary: Update a financial record (analyst and admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Record updated successfully
 *       404:
 *         description: Record not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', requireMinRole('analyst'), validate(updateRecordSchema), updateRecord);

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     tags: [Financial Records]
 *     summary: Soft-delete a financial record (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Record soft-deleted successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Record not found
 */
router.delete('/:id', requireMinRole('admin'), deleteRecord);

/* ── Dashboard / Analytics ──────────────────────────────────────────────── */

/**
 * @openapi
 * /api/records/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get overall financial summary (total income, expenses, net balance)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_income:  { type: number, example: 15000.00 }
 *                 total_expense: { type: number, example: 8500.00 }
 *                 net_balance:   { type: number, example: 6500.00 }
 *                 total_records: { type: integer, example: 42 }
 */
router.get('/dashboard/summary', requireMinRole('viewer'), getSummary);

/**
 * @openapi
 * /api/records/dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get category-wise totals broken down by income and expense
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 income:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category: { type: string }
 *                       record_count: { type: integer }
 *                       total_amount: { type: number }
 *                 expense:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/dashboard/categories', requireMinRole('viewer'), getCategoryBreakdown);

/**
 * @openapi
 * /api/records/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get monthly or weekly income/expense trends
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [monthly, weekly], default: monthly }
 *         description: Aggregation period
 *       - in: query
 *         name: count
 *         schema: { type: integer }
 *         description: Number of periods to look back (default 12 for monthly, 8 for weekly)
 *     responses:
 *       200:
 *         description: Trend data grouped by period and type
 */
router.get('/dashboard/trends', requireMinRole('analyst'), getTrendData);

/**
 * @openapi
 * /api/records/dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get the most recent financial transactions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *         description: Number of recent records to return
 *     responses:
 *       200:
 *         description: Recent transactions
 */
router.get('/dashboard/recent', requireMinRole('viewer'), getRecent);

module.exports = router;
