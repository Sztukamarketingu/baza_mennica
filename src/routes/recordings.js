'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../auth');
const { stmts } = require('../queries');
const { RECORDINGS_DIR } = require('../audio');

router.use(ensureAuth);

router.get('/recordings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).send('bad id');
  const ans = stmts.answerById.get(id);
  if (!ans) return res.status(404).send('not found');
  const filePath = path.join(RECORDINGS_DIR, path.basename(ans.audio_path));
  if (!fs.existsSync(filePath)) return res.status(404).send('file missing');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
