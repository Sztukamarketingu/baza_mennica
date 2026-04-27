'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

const { RECORDINGS_DIR } = require('../audio');
const { stmts } = require('../queries');
const { isAuthorizedN8nRequest } = require('../n8nIntegration');

const router = express.Router();
const TRANSCRIPT_STATUSES = new Set(['pending', 'done', 'skipped']);

function ensureN8nAuth(req, res, next) {
  if (!isAuthorizedN8nRequest(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

router.get('/integrations/n8n/recordings/:id', ensureN8nAuth, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'bad_answer_id' });
  }

  const answer = stmts.answerById.get(id);
  if (!answer) return res.status(404).json({ error: 'answer_not_found' });

  const filePath = path.join(RECORDINGS_DIR, path.basename(answer.audio_path));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file_missing' });

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(answer.audio_path)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(filePath).pipe(res);
});

router.post('/integrations/n8n/transcripts', ensureN8nAuth, (req, res) => {
  const answerId = Number.parseInt(req.body.answer_id, 10);
  const transcript = typeof req.body.transcript === 'string' ? req.body.transcript.trim() : '';
  const transcriptStatus = req.body.transcript_status || (transcript ? 'done' : 'skipped');

  if (!Number.isInteger(answerId) || answerId <= 0) {
    return res.status(400).json({ error: 'bad_answer_id' });
  }
  if (!TRANSCRIPT_STATUSES.has(transcriptStatus)) {
    return res.status(400).json({ error: 'bad_transcript_status' });
  }
  if (transcriptStatus === 'done' && !transcript) {
    return res.status(400).json({ error: 'transcript_required' });
  }

  const answer = stmts.answerById.get(answerId);
  if (!answer) return res.status(404).json({ error: 'answer_not_found' });

  stmts.updateTranscript.run(transcript || null, transcriptStatus, answerId);
  res.json({ ok: true, answer_id: answerId, transcript_status: transcriptStatus });
});

module.exports = router;
