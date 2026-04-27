const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const db = require('../src/db');
const migrate = require('../src/scripts/migrate');
const { RECORDINGS_DIR } = require('../src/audio');
const { resetQuestionForRerecord } = require('../src/questionReset');

test('resetQuestionForRerecord deletes answers and restores question to pending', () => {
  migrate();
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

  let categoryId;
  let questionId;
  let filePath;

  try {
    categoryId = db
      .prepare('INSERT INTO categories (code, name, sort_order) VALUES (?, ?, ?)')
      .run(`T${Date.now()}`, 'Test resetu', 9999).lastInsertRowid;
    questionId = db
      .prepare('INSERT INTO questions (category_id, text, status, priority) VALUES (?, ?, ?, ?)')
      .run(categoryId, 'Pytanie do ponownego nagrania?', 'obsolete', 9999).lastInsertRowid;

    const fileName = `reset-test-${questionId}.mp3`;
    filePath = path.join(RECORDINGS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from('fake mp3'));

    db.prepare(
      "INSERT INTO answers (question_id, audio_path, duration_seconds, transcript, transcript_status) VALUES (?, ?, ?, ?, 'done')"
    ).run(questionId, fileName, 7, 'Stary transkrypt');

    const result = resetQuestionForRerecord(questionId);

    assert.equal(result.deletedAnswers, 1);
    assert.equal(result.deletedFiles, 1);
    assert.equal(fs.existsSync(filePath), false);

    const question = db.prepare('SELECT status FROM questions WHERE id = ?').get(questionId);
    const answerCount = db.prepare('SELECT COUNT(*) AS c FROM answers WHERE question_id = ?').get(questionId).c;

    assert.equal(question.status, 'pending');
    assert.equal(answerCount, 0);
  } finally {
    if (questionId) db.prepare('DELETE FROM answers WHERE question_id = ?').run(questionId);
    if (questionId) db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
    if (categoryId) db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});
