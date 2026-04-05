'use strict';

const { register, login } = require('../services/auth.service');
const { sanitize } = require('../models/user.model');
const { sendSuccess } = require('../utils/response');

async function registerUser(req, res, next) {
  try {
    const user = await register(req.body);
    return sendSuccess(res, 201, 'Account created successfully.', user);
  } catch (err) {
    next(err);
  }
}

async function loginUser(req, res, next) {
  try {
    const result = await login(req.body);
    return sendSuccess(res, 200, 'Login successful.', result);
  } catch (err) {
    next(err);
  }
}

function getMe(req, res) {
  return sendSuccess(res, 200, 'Profile retrieved.', sanitize(req.user));
}

module.exports = { registerUser, loginUser, getMe };
