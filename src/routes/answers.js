'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const { ensureAuth, verifyCsrf } = require('../auth');
const { stmts } = require('../queries');
const { notifyN8nAnswerRecorded } = require('../n8nIntegration');
const {
  RECORDINGS_DIR,
  TMP_DIR,
  buildMp3Filename,
  convertToMp3,
  probeDurationSeconds
} = require('../audio');

const router = express.Router();

const ALLOWED_MIMES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const rand = crypto.randomBytes(8).toString('hex');
    const safeExt = (path.extname(file.originalname || '') || '.bin').slice(0, 8);
    cb(null, `upload_${Date.now()}_${rand}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const m = (file.mimetype || '').toLowerCase();
    if (ALLOWED_MIMES.has(m) || m.startsWith('audio/')) return cb(null, true);
    cb(new Error('unsupported_audio_mime: ' + m));
  }
});

router.use(ensureAuth);

router.post(
  '/answers',
  (req, res, next) => {
    upload.single('audio')(req, res, (err) => {
      if (err) {
        const msg = err.message || 'upload_error';
        const code = msg.startsWith('unsupported_audio_mime') ? 415 : 400;
        return res.status(code).json({ error: msg });
      }
      next();
    });
  },
  verifyCsrf,
  async (req, res) => {
    const questionId = parseInt(req.body.question_id, 10);
    if (!Number.isInteger(questionId)) {
      cleanupTmp(req.file);
      return res.status(400).json({ error: 'question_id_required' });
    }
    const q = stmts.questionById.get(questionId);
    if (!q) {
      cleanupTmp(req.file);
      return res.status(404).json({ error: 'question_not_found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'audio_required' });
    }

    const inputPath = req.file.path;
    const filename = buildMp3Filename(questionId);
    const outputPath = path.join(RECORDINGS_DIR, filename);

    try {
      await convertToMp3(inputPath, outputPath);
      const duration = (await probeDurationSeconds(outputPath)) || null;

      const ins = stmts.insertAnswer.run(questionId, filename, duration);
      stmts.updateQuestionStatus.run('answered', questionId);
      notifyN8nAnswerRecorded(ins.lastInsertRowid).then((result) => {
        if (!result.ok && !result.skipped) {
          console.warn('[n8n] Webhook notification failed', result);
        }
      });

      res.json({
        ok: true,
        answer_id: ins.lastInsertRowid,
        audio_url: `/recordings/${ins.lastInsertRowid}`,
        duration_seconds: duration
      });
    } catch (err) {
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      }
      console.error('[answers] conversion error', err);
      res.status(500).json({ error: 'audio_conversion_failed', detail: err.message });
    } finally {
      cleanupTmp(req.file);
    }
  }
);

function cleanupTmp(file) {
  if (!file || !file.path) return;
  fs.unlink(file.path, () => {});
}

module.exports = router;
