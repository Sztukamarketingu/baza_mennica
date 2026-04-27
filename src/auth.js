'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

function getEnvUser() {
  const email = process.env.ADMIN_EMAIL;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (email && hash) {
    return { id: 0, email, password_hash: hash, source: 'env' };
  }
  return null;
}

function findUserByEmail(email) {
  if (!email) return null;
  const envUser = getEnvUser();
  if (envUser && envUser.email.toLowerCase() === email.toLowerCase()) {
    return envUser;
  }
  return db
    .prepare('SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER(?)')
    .get(email);
}

async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch (err) {
    return false;
  }
}

function ensureAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  const accept = req.get('accept') || '';
  const wantsHtml = req.method === 'GET' && accept.includes('text/html');
  if (wantsHtml) {
    return res.redirect('/login');
  }
  return res.status(401).json({ error: 'unauthorized' });
}

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  const expected = req.session && req.session.csrfToken;
  const provided = (req.body && req.body._csrf) || req.get('X-CSRF-Token');
  if (!expected || !provided || expected !== provided) {
    return res.status(403).json({ error: 'invalid_csrf_token' });
  }
  return next();
}

module.exports = {
  findUserByEmail,
  verifyPassword,
  ensureAuth,
  ensureCsrfToken,
  verifyCsrf
};
