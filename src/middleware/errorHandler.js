'use strict';

const { sendError } = require('../utils/response');

/**
 * Global Express error handler — must have 4 parameters to work as error middleware.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message, err.stack);

  // SQLite constraint errors (e.g. UNIQUE constraint)
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE constraint')) {
    return sendError(res, 409, 'A record with that value already exists.');
  }

  // Generic 500
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  return sendError(res, err.statusCode || 500, message);
}

module.exports = { errorHandler };
