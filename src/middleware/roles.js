'use strict';

const { sendError } = require('../utils/response');

/**
 * Role hierarchy — higher index = more permissions.
 */
const ROLE_HIERARCHY = { viewer: 0, analyst: 1, admin: 2 };

/**
 * Returns middleware that checks whether the authenticated user
 * has one of the allowed roles.
 *
 * Usage:  router.post('/records', authenticate, requireRole('analyst', 'admin'), handler)
 *
 * @param {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const allowed = allowedRoles.some(
      (role) => ROLE_HIERARCHY[role] !== undefined && userRoleLevel >= ROLE_HIERARCHY[role]
    );

    // We check against the MINIMUM role in the allowed list — if user's level meets
    // or exceeds the lowest required role they have access.
    // But for explicit role lists (e.g. only 'admin'), we do exact membership check.
    const exactMatch = allowedRoles.includes(req.user.role);

    if (!exactMatch) {
      return sendError(
        res,
        403,
        `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`
      );
    }

    next();
  };
}

/**
 * Returns middleware that checks whether the user has AT LEAST the given role level.
 * e.g. requireMinRole('analyst') allows both analyst and admin.
 *
 * @param {string} minRole
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? Infinity;

    if (userLevel < requiredLevel) {
      return sendError(
        res,
        403,
        `Access denied. You need at least '${minRole}' role. Your role: ${req.user.role}.`
      );
    }

    next();
  };
}

module.exports = { requireRole, requireMinRole };
