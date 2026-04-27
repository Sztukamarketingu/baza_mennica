'use strict';

const db = require('./db');

const stmts = {
  nextQuestion: db.prepare(`
    SELECT q.id, q.text, q.status, q.priority, q.category_id,
           c.code AS category_code, c.name AS category_name, c.sort_order AS category_sort
    FROM questions q
    LEFT JOIN categories c ON c.id = q.category_id
    WHERE q.status = 'pending'
    ORDER BY c.sort_order ASC, q.priority ASC, q.id ASC
    LIMIT 1
  `),

  questionById: db.prepare(`
    SELECT q.id, q.text, q.status, q.priority, q.category_id,
           c.code AS category_code, c.name AS category_name
    FROM questions q
    LEFT JOIN categories c ON c.id = q.category_id
    WHERE q.id = ?
  `),

  countByStatus: db.prepare(`
    SELECT status, COUNT(*) AS c FROM questions GROUP BY status
  `),

  totalQuestions: db.prepare('SELECT COUNT(*) AS c FROM questions'),
  answeredQuestions: db.prepare(`SELECT COUNT(*) AS c FROM questions WHERE status = 'answered'`),

  allCategories: db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC'),
  defaultCategoryId: db.prepare(`SELECT id FROM categories ORDER BY sort_order ASC, id ASC LIMIT 1`),

  allQuestionsForAdmin: db.prepare(`
    SELECT q.id, q.text, q.status, q.priority, q.category_id, q.created_at,
           c.code AS category_code, c.name AS category_name,
           (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count,
           (SELECT a.id FROM answers a WHERE a.question_id = q.id ORDER BY a.recorded_at DESC LIMIT 1) AS latest_answer_id
    FROM questions q
    LEFT JOIN categories c ON c.id = q.category_id
    ORDER BY c.sort_order ASC, q.priority ASC, q.id ASC
  `),

  insertQuestion: db.prepare(`
    INSERT INTO questions (category_id, text, status, priority)
    VALUES (?, ?, 'pending', ?)
  `),

  updateQuestionStatus: db.prepare(`
    UPDATE questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  updateQuestionText: db.prepare(`
    UPDATE questions SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  bumpPriorityToEnd: db.prepare(`
    UPDATE questions SET priority = (
      SELECT IFNULL(MAX(priority), 0) + 1 FROM questions WHERE category_id = (
        SELECT category_id FROM questions WHERE id = ?
      )
    ), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  insertAnswer: db.prepare(`
    INSERT INTO answers (question_id, audio_path, duration_seconds)
    VALUES (?, ?, ?)
  `),

  answerById: db.prepare(`
    SELECT a.*, q.text AS question_text, c.name AS category_name, c.code AS category_code
    FROM answers a
    LEFT JOIN questions q ON q.id = a.question_id
    LEFT JOIN categories c ON c.id = q.category_id
    WHERE a.id = ?
  `),

  allAnswersForExport: db.prepare(`
    SELECT a.id, a.question_id, a.audio_path, a.duration_seconds, a.transcript,
           a.transcript_status, a.recorded_at,
           q.text AS question_text,
           c.code AS category_code, c.name AS category_name, c.sort_order AS category_sort
    FROM answers a
    LEFT JOIN questions q ON q.id = a.question_id
    LEFT JOIN categories c ON c.id = q.category_id
    ORDER BY c.sort_order ASC, q.priority ASC, a.recorded_at ASC
  `),

  pendingTranscriptAnswers: db.prepare(`
    SELECT a.id, a.audio_path, a.recorded_at, q.text AS question_text
    FROM answers a
    LEFT JOIN questions q ON q.id = a.question_id
    WHERE a.transcript_status = 'pending'
    ORDER BY a.recorded_at ASC
  `),

  setTranscript: db.prepare(`
    UPDATE answers SET transcript = ?, transcript_status = 'done' WHERE id = ?
  `),

  updateTranscript: db.prepare(`
    UPDATE answers
    SET transcript = ?, transcript_status = ?
    WHERE id = ?
  `)
};

function getProgress() {
  const total = stmts.totalQuestions.get().c;
  const answered = stmts.answeredQuestions.get().c;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return { total, answered, pct };
}

function getStatusCounts() {
  const rows = stmts.countByStatus.all();
  const out = { pending: 0, answered: 0, skipped: 0, obsolete: 0 };
  rows.forEach((r) => {
    out[r.status] = r.c;
  });
  return out;
}

module.exports = { stmts, getProgress, getStatusCounts };
