'use strict';

/**
 * Import transkryptów z pliku JSON do bazy.
 *
 * Format pliku (tablica obiektów):
 * [
 *   { "answer_id": 12, "transcript": "Tekst odpowiedzi..." },
 *   { "audio_path": "q5_2026-04-27T...mp3", "transcript": "..." }
 * ]
 *
 * Użycie:
 *   node src/scripts/import-transcripts.js path/to/transcripts.json
 */

require('dotenv').config();
const fs = require('fs');
const db = require('../db');
const migrate = require('./migrate');

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Podaj ścieżkę do pliku JSON, np.:');
    console.error('  node src/scripts/import-transcripts.js transcripts.json');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error('Plik nie istnieje:', file);
    process.exit(1);
  }
  migrate();

  const raw = fs.readFileSync(file, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    console.error('Błędny JSON:', err.message);
    process.exit(1);
  }
  if (!Array.isArray(items)) {
    console.error('Plik powinien zawierać tablicę obiektów.');
    process.exit(1);
  }

  const byId = db.prepare(
    `UPDATE answers SET transcript = ?, transcript_status = 'done' WHERE id = ?`
  );
  const byPath = db.prepare(
    `UPDATE answers SET transcript = ?, transcript_status = 'done' WHERE audio_path = ?`
  );
  const findId = db.prepare(`SELECT id FROM answers WHERE id = ?`);
  const findPath = db.prepare(`SELECT id FROM answers WHERE audio_path = ?`);

  let updated = 0;
  let missing = 0;
  const tx = db.transaction(() => {
    for (const it of items) {
      if (!it || typeof it.transcript !== 'string') continue;
      if (it.answer_id != null && findId.get(it.answer_id)) {
        byId.run(it.transcript, it.answer_id);
        updated++;
      } else if (it.audio_path && findPath.get(it.audio_path)) {
        byPath.run(it.transcript, it.audio_path);
        updated++;
      } else {
        missing++;
      }
    }
  });
  tx();

  console.log(`[import] zaktualizowano ${updated}, nie znaleziono ${missing}`);
}

main();
