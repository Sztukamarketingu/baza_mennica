'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const { DATA_DIR } = require('./db');
require('./scripts/migrate')();

const authRouter = require('./routes/auth');
const sessionRouter = require('./routes/session');
const answersRouter = require('./routes/answers');
const adminRouter = require('./routes/admin');
const exportRouter = require('./routes/export');
const recordingsRouter = require('./routes/recordings');
const integrationsRouter = require('./routes/integrations');
const { ensureCsrfToken } = require('./auth');

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SECURE_COOKIE = String(process.env.SECURE_COOKIE || 'false').toLowerCase() === 'true';

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }),
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE_COOKIE,
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  })
);

app.use((req, res, next) => {
  res.locals.csrf = ensureCsrfToken(req);
  res.locals.user = req.session && req.session.user;
  res.locals.basePath = process.env.BASE_PATH || '';
  next();
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use(integrationsRouter);
app.use(authRouter);
app.use(answersRouter);
app.use(recordingsRouter);
app.use(exportRouter);
app.use(adminRouter);
app.use(sessionRouter);

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal_error' });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
  console.warn(
    '[warn] Brak ADMIN_EMAIL / ADMIN_PASSWORD_HASH w .env — login nie będzie działać. ' +
      'Wygeneruj hash: `npm run hash-password -- "TwojeHaslo"` i wpisz wartości w .env.'
  );
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] Mennica Knowledge Collector listening on http://${HOST}:${PORT}`);
});

function shutdown() {
  console.log('[server] Shutdown requested.');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
