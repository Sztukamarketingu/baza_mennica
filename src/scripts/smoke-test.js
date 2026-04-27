'use strict';

/**
 * Smoke test:
 * 1. Uruchamia migrację + seed.
 * 2. Generuje krótkie WAV z ffmpeg (cisza 1s).
 * 3. Konwertuje go do mp3 przez moduł audio (jak prawdziwy upload).
 * 4. Wstawia rekord answer + ustawia status pytania na 'answered'.
 * 5. Generuje eksport Markdown w pamięci i sprawdza, czy zawiera tekst pytania.
 *
 * Uruchomienie:  npm run smoke-test
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const db = require('../db');
const migrate = require('./migrate');
const seed = require('./seed');
const { stmts } = require('../queries');
const {
  RECORDINGS_DIR,
  TMP_DIR,
  buildMp3Filename,
  convertToMp3,
  probeDurationSeconds
} = require('../audio');

async function main() {
  migrate();
  seed();

  const next = stmts.nextQuestion.get();
  if (!next) {
    throw new Error('Brak pytania do testu — czy seed przeszedł?');
  }
  console.log('[smoke] Następne pytanie:', next.id, '→', next.text.slice(0, 60));

  const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg';
  const inputPath = path.join(TMP_DIR, `smoke_${Date.now()}.wav`);
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

  const gen = spawnSync(
    ffmpegBin,
    ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-ac', '1', inputPath],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  if (gen.status !== 0) {
    throw new Error('ffmpeg nie wygenerował testowego pliku WAV: ' + gen.stderr.toString());
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error('Brak testowego pliku WAV.');
  }

  const filename = buildMp3Filename(next.id);
  const outputPath = path.join(RECORDINGS_DIR, filename);
  await convertToMp3(inputPath, outputPath);
  if (!fs.existsSync(outputPath)) {
    throw new Error('Konwersja do mp3 nie utworzyła pliku.');
  }
  const dur = await probeDurationSeconds(outputPath);
  console.log('[smoke] Plik mp3 OK,', fs.statSync(outputPath).size, 'B,', dur, 's');

  const ins = stmts.insertAnswer.run(next.id, filename, dur);
  stmts.updateQuestionStatus.run('answered', next.id);
  console.log('[smoke] Wstawiono answer.id =', ins.lastInsertRowid);

  const rows = stmts.allAnswersForExport.all();
  const lines = ['# Baza wiedzy mennica.pl', ''];
  for (const r of rows) {
    lines.push(`### Pytanie: ${r.question_text}`);
    lines.push(`- Audio: /recordings/${r.id}`);
    lines.push('');
  }
  const md = lines.join('\n');
  if (!md.includes(next.text)) {
    throw new Error('Eksport Markdown nie zawiera tekstu pytania.');
  }
  console.log('[smoke] Eksport Markdown zawiera pytanie z odpowiedzią ✔');

  fs.unlinkSync(inputPath);

  const progress = stmts.totalQuestions.get().c;
  const answered = stmts.answeredQuestions.get().c;
  console.log(`[smoke] Stan po teście: ${answered}/${progress} odpowiedzi.`);
  console.log('[smoke] OK — wszystko działa.');
}

main().catch((err) => {
  console.error('[smoke] FAIL:', err.message);
  process.exit(1);
});
