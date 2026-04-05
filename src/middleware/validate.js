'use strict';

const { sendError } = require('../utils/response');

/**
 * Factory — returns an Express middleware that validates `req.body`,
 * `req.query`, or `req.params` against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const zodError  = result.error;
        const issueList = Array.isArray(zodError.issues)
          ? zodError.issues
          : Array.isArray(zodError.errors)
            ? zodError.errors
            : [];

        const errors = issueList.map((e) => ({
          field:   Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
          message: e.message,
        }));

        return sendError(res, 422, 'Validation failed. Please check your input.', errors);
      }

      // Replace source with the validated (and potentially coerced) data
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate };
