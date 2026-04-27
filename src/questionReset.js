'use strict';

const fs = require('fs');
const path = require('path');

const db = require('./db');
const { RECORDINGS_DIR } = require('./audio');

const listAnswersForQuestion = db.prepare(`
  SELECT id, audio_path
  FROM answers
  WHERE question_id = ?
`);

const deleteAnswersForQuestion = db.prepare(`
  DELETE FROM answers
  WHERE question_id = ?
`);

const restoreQuestionToPending = db.prepare(`
  UPDATE questions
  SET status = 'pending',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const questionExists = db.prepare(`
  SELECT id
  FROM questions
  WHERE id = ?
`);

function resetQuestionForRerecord(questionId) {
  const id = Number.parseInt(questionId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('bad_question_id');
    err.statusCode = 400;
    throw err;
  }

  if (!questionExists.get(id)) {
    const err = new Error('question_not_found');
    err.statusCode = 404;
    throw err;
  }

  const answers = listAnswersForQuestion.all(id);
  const tx = db.transaction(() => {
    deleteAnswersForQuestion.run(id);
    restoreQuestionToPending.run(id);
  });
  tx();

  let deletedFiles = 0;
  for (const answer of answers) {
    const filePath = path.join(RECORDINGS_DIR, path.basename(answer.audio_path));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedFiles += 1;
      }
    } catch (err) {
      console.warn('[questionReset] Could not delete recording', filePath, err.message);
    }
  }

  return {
    ok: true,
    questionId: id,
    deletedAnswers: answers.length,
    deletedFiles
  };
}

module.exports = {
  resetQuestionForRerecord
};
