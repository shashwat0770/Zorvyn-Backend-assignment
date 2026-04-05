'use strict';

const {
  listUsers,
  getUser,
  changeRole,
  changeStatus,
  removeUser,
} = require('../services/user.service');
const { sendSuccess } = require('../utils/response');

function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, status, role } = req.query;
    const result = listUsers({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      status,
      role,
    });
    return sendSuccess(res, 200, 'Users retrieved.', result.users, result.meta);
  } catch (err) {
    next(err);
  }
}

function getSingleUser(req, res, next) {
  try {
    const user = getUser(parseInt(req.params.id));
    return sendSuccess(res, 200, 'User retrieved.', user);
  } catch (err) {
    next(err);
  }
}

function updateRole(req, res, next) {
  try {
    const user = changeRole(parseInt(req.params.id), req.body.role);
    return sendSuccess(res, 200, 'User role updated.', user);
  } catch (err) {
    next(err);
  }
}

function updateStatus(req, res, next) {
  try {
    const user = changeStatus(parseInt(req.params.id), req.body.status);
    return sendSuccess(res, 200, 'User status updated.', user);
  } catch (err) {
    next(err);
  }
}

function deleteUser(req, res, next) {
  try {
    removeUser(req.user.id, parseInt(req.params.id));
    return sendSuccess(res, 200, 'User deleted successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers, getSingleUser, updateRole, updateStatus, deleteUser };
