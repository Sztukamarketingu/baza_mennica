'use strict';

const express = require('express');
const router = express.Router();
const { ensureAuth, ensureCsrfToken, verifyCsrf } = require('../auth');
const { stmts, getProgress } = require('../queries');
const { resetQuestionForRerecord } = require('../questionReset');

router.use(ensureAuth);

router.get('/', (req, res) => {
  const csrf = ensureCsrfToken(req);
  const next = stmts.nextQuestion.get();
  const progress = getProgress();
  res.render('session', {
    csrf,
    user: req.session.user,
    question: next || null,
    progress,
    maxRecordingSeconds: parseInt(process.env.MAX_RECORDING_SECONDS || '300', 10)
  });
});

router.get('/questions/next', (req, res) => {
  const next = stmts.nextQuestion.get();
  const progress = getProgress();
  if (!next) return res.json({ done: true, progress });
  res.json({ done: false, question: next, progress });
});

router.get('/categories.json', (req, res) => {
  res.json(stmts.allCategories.all());
});

router.post('/questions', verifyCsrf, (req, res) => {
  const text = (req.body.text || '').trim();
  let categoryId = parseInt(req.body.category_id, 10);
  if (!text) return res.status(400).json({ error: 'text_required' });
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    const def = stmts.defaultCategoryId.get();
    if (!def) return res.status(500).json({ error: 'no_categories' });
    categoryId = def.id;
  }
  const result = stmts.insertQuestion.run(categoryId, text, 9999);
  res.json({ ok: true, id: result.lastInsertRowid });
});

router.post('/questions/:id/skip', verifyCsrf, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_id' });
  const q = stmts.questionById.get(id);
  if (!q) return res.status(404).json({ error: 'not_found' });
  stmts.bumpPriorityToEnd.run(id, id);
  res.json({ ok: true });
});

router.post('/questions/:id/obsolete', verifyCsrf, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_id' });
  const q = stmts.questionById.get(id);
  if (!q) return res.status(404).json({ error: 'not_found' });
  stmts.updateQuestionStatus.run('obsolete', id);
  res.json({ ok: true });
});

router.post('/questions/:id/reset', verifyCsrf, (req, res) => {
  try {
    const result = resetQuestionForRerecord(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'reset_failed' });
  }
});

router.post('/questions/:id/edit', verifyCsrf, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const text = (req.body.text || '').trim();
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_id' });
  if (!text) return res.status(400).json({ error: 'text_required' });
  const q = stmts.questionById.get(id);
  if (!q) return res.status(404).json({ error: 'not_found' });
  stmts.updateQuestionText.run(text, id);
  res.json({ ok: true });
});

module.exports = router;
