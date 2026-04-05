'use strict';

const { Router } = require('express');
const { z } = require('zod');
const {
  getAllUsers,
  getSingleUser,
  updateRole,
  updateStatus,
  deleteUser,
} = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requireMinRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');

const router = Router();

/* ── Validation Schemas ─────────────────────────────────────────────────── */

const roleSchema = z.object({
  role: z.enum(['viewer', 'analyst', 'admin'], {
    errorMap: () => ({ message: "Role must be one of: 'viewer', 'analyst', 'admin'." }),
  }),
});

const statusSchema = z.object({
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: "Status must be one of: 'active', 'inactive'." }),
  }),
});

/* ── All routes require authentication ──────────────────────────────────── */
router.use(authenticateToken);

/* ── Routes ─────────────────────────────────────────────────────────────── */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [viewer, analyst, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', requireRole('admin'), getAllUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a specific user by ID (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get('/:id', requireRole('admin'), getSingleUser);

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role (admin only)
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, admin]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id/role', requireRole('admin'), validate(roleSchema), updateRole);

/**
 * @openapi
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user (admin only)
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id/status', requireRole('admin'), validate(statusSchema), updateStatus);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin only; cannot delete own account)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete own account
 *       404:
 *         description: User not found
 */
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
