'use strict';

const {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  sanitize,
} = require('../models/user.model');

function listUsers(filters) {
  const { rows, total, page, limit } = getAllUsers(filters);
  return {
    users: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function getUser(id) {
  const user = getUserById(id);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return sanitize(user);
}

function changeRole(id, role) {
  const user = getUserById(id);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  const updated = updateUserRole(id, role);
  return sanitize(updated);
}

function changeStatus(id, status) {
  const user = getUserById(id);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  const updated = updateUserStatus(id, status);
  return sanitize(updated);
}

function removeUser(requesterId, targetId) {
  if (Number(requesterId) === Number(targetId)) {
    const err = new Error('You cannot delete your own account.');
    err.statusCode = 400;
    throw err;
  }
  const user = getUserById(targetId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  deleteUser(targetId);
}

module.exports = { listUsers, getUser, changeRole, changeStatus, removeUser };
