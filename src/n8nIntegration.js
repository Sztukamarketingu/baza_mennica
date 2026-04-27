'use strict';

const crypto = require('crypto');

const { stmts } = require('./queries');

const DEFAULT_TIMEOUT_MS = 15000;

function baseUrl() {
  return (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function n8nSharedSecret() {
  return process.env.N8N_SHARED_SECRET || '';
}

function n8nWebhookUrl() {
  return process.env.N8N_WEBHOOK_URL || '';
}

function isN8nConfigured() {
  return Boolean(n8nWebhookUrl() && n8nSharedSecret());
}

function buildN8nPayload(answer, options = {}) {
  const root = (options.baseUrl || baseUrl()).replace(/\/+$/, '');
  return {
    event: 'answer.recorded',
    answer_id: answer.id,
    question_id: answer.question_id,
    question: answer.question_text,
    category_code: answer.category_code,
    category: answer.category_name,
    duration_seconds: answer.duration_seconds,
    transcript_status: answer.transcript_status,
    recorded_at: answer.recorded_at,
    audio_download_url: `${root}/integrations/n8n/recordings/${answer.id}`,
    callback_url: `${root}/integrations/n8n/transcripts`,
    auth_header_name: 'X-N8N-Secret'
  };
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function extractProvidedSecret(req) {
  const headerSecret = req.get('X-N8N-Secret');
  if (headerSecret) return headerSecret;

  const auth = req.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function isAuthorizedN8nRequest(req) {
  const expected = n8nSharedSecret();
  if (!expected) return false;
  return timingSafeEqualString(extractProvidedSecret(req), expected);
}

async function notifyN8nAnswerRecorded(answerId) {
  if (!isN8nConfigured()) {
    return { ok: false, skipped: true, reason: 'n8n_not_configured' };
  }

  const answer = stmts.answerById.get(answerId);
  if (!answer) {
    return { ok: false, skipped: true, reason: 'answer_not_found' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(n8nWebhookUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Secret': n8nSharedSecret()
      },
      body: JSON.stringify(buildN8nPayload(answer)),
      signal: controller.signal
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, status: res.status, body: body.slice(0, 500) };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  buildN8nPayload,
  isAuthorizedN8nRequest,
  isN8nConfigured,
  notifyN8nAnswerRecorded
};
