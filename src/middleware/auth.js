'use strict';

const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');
const { getUserById } = require('../models/user.model');

/**
 * Middleware — verify JWT Bearer token and attach `req.user`.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return sendError(res, 401, 'Authentication required. Please provide a Bearer token.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-validate user still exists and is active
    const user = getUserById(decoded.id);
    if (!user) {
      return sendError(res, 401, 'User account no longer exists.');
    }
    if (user.status !== 'active') {
      return sendError(res, 403, 'Your account has been deactivated. Contact an admin.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Session expired. Please log in again.');
    }
    return sendError(res, 401, 'Invalid token. Please log in again.');
  }
}

module.exports = { authenticateToken };
