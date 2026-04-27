'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../auth');
const { stmts } = require('../queries');
const { RECORDINGS_DIR } = require('../audio');

router.use(ensureAuth);

function buildAudioUrl(req, answerId) {
  const base = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  return `${base}/recordings/${answerId}`;
}

router.get('/export.json', (req, res) => {
  const rows = stmts.allAnswersForExport.all();
  const data = rows.map((r) => ({
    answer_id: r.id,
    question_id: r.question_id,
    question: r.question_text,
    category_code: r.category_code,
    category: r.category_name,
    answer_audio_url: buildAudioUrl(req, r.id),
    audio_path: r.audio_path,
    duration_seconds: r.duration_seconds,
    transcript: r.transcript,
    transcript_status: r.transcript_status,
    recorded_at: r.recorded_at
  }));
  res.setHeader('Content-Disposition', 'attachment; filename="mennica-knowledge.json"');
  res.json({ exported_at: new Date().toISOString(), count: data.length, items: data });
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

router.get('/export.csv', (req, res) => {
  const rows = stmts.allAnswersForExport.all();
  const headers = [
    'answer_id', 'question_id', 'question', 'category_code', 'category',
    'answer_audio_url', 'duration_seconds', 'transcript', 'transcript_status', 'recorded_at'
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.id,
      r.question_id,
      csvEscape(r.question_text),
      csvEscape(r.category_code),
      csvEscape(r.category_name),
      csvEscape(buildAudioUrl(req, r.id)),
      r.duration_seconds || '',
      csvEscape(r.transcript || ''),
      r.transcript_status,
      r.recorded_at
    ].join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mennica-knowledge.csv"');
  res.send('\ufeff' + lines.join('\n'));
});

router.get('/export.md', (req, res) => {
  const rows = stmts.allAnswersForExport.all();
  const byCat = new Map();
  for (const r of rows) {
    const key = r.category_code || '?';
    if (!byCat.has(key)) {
      byCat.set(key, { code: r.category_code, name: r.category_name, sort: r.category_sort, items: [] });
    }
    byCat.get(key).items.push(r);
  }
  const sorted = [...byCat.values()].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  const out = [];
  out.push('# Baza wiedzy mennica.pl');
  out.push('');
  out.push(`Wygenerowano: ${new Date().toISOString()}`);
  out.push(`Liczba par Q&A: ${rows.length}`);
  out.push('');
  for (const cat of sorted) {
    out.push(`## ${cat.code ? cat.code + ' — ' : ''}${cat.name || 'Bez kategorii'}`);
    out.push('');
    for (const r of cat.items) {
      out.push(`### Pytanie: ${r.question_text}`);
      out.push('');
      out.push(`- Audio: [${buildAudioUrl(req, r.id)}](${buildAudioUrl(req, r.id)})`);
      if (r.duration_seconds) out.push(`- Czas trwania: ${r.duration_seconds}s`);
      out.push(`- Nagrano: ${r.recorded_at}`);
      out.push('');
      out.push('**Odpowiedź (transkrypt):**');
      out.push('');
      if (r.transcript_status === 'done' && r.transcript) {
        out.push(r.transcript);
      } else {
        out.push('_Transkrypt jeszcze nie został dodany._');
      }
      out.push('');
    }
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="mennica-knowledge.md"');
  res.send(out.join('\n'));
});

router.get('/export-pending-zip', (req, res) => {
  const rows = stmts.pendingTranscriptAnswers.all();
  if (rows.length === 0) {
    return res.status(204).end();
  }
  const files = rows
    .map((r) => path.join(RECORDINGS_DIR, path.basename(r.audio_path)))
    .filter((p) => fs.existsSync(p));
  if (files.length === 0) {
    return res.status(204).end();
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="mennica-pending-${Date.now()}.zip"`
  );
  const args = ['-j', '-q', '-', ...files];
  const zip = spawn('zip', args);
  zip.stdout.pipe(res);
  zip.stderr.on('data', (d) => console.error('[zip]', d.toString()));
  zip.on('error', (err) => {
    console.error('[zip] spawn error', err);
    if (!res.headersSent) res.status(500).send('zip_unavailable');
  });
});

module.exports = router;
