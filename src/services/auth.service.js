'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, sanitize } = require('../models/user.model');

/**
 * Register a new user (default role: viewer).
 */
async function register({ name, email, password }) {
  const existing = getUserByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = createUser({ name, email, password: hash });
  return sanitize(user);
}

/**
 * Login and return a signed JWT.
 */
async function login({ email, password }) {
  const user = getUserByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (user.status !== 'active') {
    const err = new Error('Your account has been deactivated. Contact an admin.');
    err.statusCode = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { token, user: sanitize(user) };
}

module.exports = { register, login };
