'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const swaggerUi  = require('swagger-ui-express');

const { initDatabase }  = require('./src/config/database');
const swaggerSpec       = require('./src/config/swagger');
const apiRouter         = require('./src/routes/index');
const { errorHandler }  = require('./src/middleware/errorHandler');
const { sendError }     = require('./src/utils/response');

/* ── Bootstrap DB ───────────────────────────────────────────────────────── */
initDatabase();

/* ── App ────────────────────────────────────────────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Security / Utility Middleware ──────────────────────────────────────── */
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Rate Limiting ───────────────────────────────────────────────────────
 *  Global limiter: 200 req / 15 min per IP.
 *  Stricter limiter on auth endpoints: 15 req / 15 min.
 * ────────────────────────────────────────────────────────────────────── */
const isProduction = process.env.NODE_ENV === 'production';

// In non-production environments (development/test) we skip rate limiting
// entirely so automated test suites never exhaust the in-memory counters.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: () => !isProduction,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: () => !isProduction,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

/* ── API Docs ────────────────────────────────────────────────────────────
 *  Swagger UI available at /api-docs
 * ────────────────────────────────────────────────────────────────────── */
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Zorvyn Finance API Docs',
    customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
  })
);

/* Serve raw OpenAPI JSON for external tools */
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

/* ── API Routes ─────────────────────────────────────────────────────────── */
app.use('/api', apiRouter);

/* ── 404 Handler ─────────────────────────────────────────────────────────  */
app.use((req, res) => {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
});

/* ── Global Error Handler ────────────────────────────────────────────────  */
app.use(errorHandler);

/* ── Start ───────────────────────────────────────────────────────────────  */
app.listen(PORT, () => {
  console.log(`\n🚀  Server running on port ${PORT}`);
  console.log(`📖  Swagger docs  →  http://localhost:${PORT}/api-docs`);
  console.log(`🌍  Environment   →  ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app; // Export for testing
