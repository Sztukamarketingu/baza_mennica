'use strict';

const express = require('express');
const router = express.Router();
const { ensureAuth, ensureCsrfToken } = require('../auth');
const { stmts, getProgress, getStatusCounts } = require('../queries');

router.use(ensureAuth);

router.get('/admin', (req, res) => {
  const csrf = ensureCsrfToken(req);
  const questions = stmts.allQuestionsForAdmin.all();
  const categories = stmts.allCategories.all();
  const progress = getProgress();
  const statusCounts = getStatusCounts();
  const pendingTranscripts = stmts.pendingTranscriptAnswers.all().length;

  const grouped = {};
  categories.forEach((c) => {
    grouped[c.id] = { category: c, questions: [] };
  });
  questions.forEach((q) => {
    if (!grouped[q.category_id]) {
      grouped[q.category_id] = { category: { id: q.category_id, code: '?', name: 'Bez kategorii' }, questions: [] };
    }
    grouped[q.category_id].questions.push(q);
  });

  res.render('admin', {
    csrf,
    user: req.session.user,
    grouped: Object.values(grouped),
    categories,
    progress,
    statusCounts,
    pendingTranscripts
  });
});

module.exports = router;
