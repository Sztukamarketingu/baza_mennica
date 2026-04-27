'use strict';

const express = require('express');
const router = express.Router();
const { findUserByEmail, verifyPassword, ensureCsrfToken } = require('../auth');

router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  const csrf = ensureCsrfToken(req);
  res.render('login', { csrf, error: null, email: '' });
});

router.post('/login', async (req, res) => {
  const expected = req.session && req.session.csrfToken;
  const provided = req.body && req.body._csrf;
  if (!expected || expected !== provided) {
    return res.status(403).render('login', {
      csrf: ensureCsrfToken(req),
      error: 'Sesja wygasła, spróbuj ponownie.',
      email: req.body.email || ''
    });
  }

  const email = (req.body.email || '').trim();
  const password = req.body.password || '';

  const user = findUserByEmail(email);
  const ok = user && (await verifyPassword(password, user.password_hash));

  if (!ok) {
    return res.status(401).render('login', {
      csrf: ensureCsrfToken(req),
      error: 'Niepoprawny email lub hasło.',
      email
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('login', {
        csrf: ensureCsrfToken(req),
        error: 'Błąd sesji, spróbuj ponownie.',
        email
      });
    }
    req.session.user = { id: user.id, email: user.email };
    ensureCsrfToken(req);
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;
