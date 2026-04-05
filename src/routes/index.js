'use strict';

const { Router } = require('express');

const authRoutes    = require('./auth.routes');
const userRoutes    = require('./user.routes');
const financeRoutes = require('./finance.routes');

const router = Router();

router.use('/auth',    authRoutes);
router.use('/users',   userRoutes);
router.use('/records', financeRoutes);

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check — confirms the API is running
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: OK }
 *                 uptime:  { type: number }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/health', (req, res) => {
  res.json({
    success:   true,
    message:   'OK',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
