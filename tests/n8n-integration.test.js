const assert = require('node:assert/strict');
const test = require('node:test');

process.env.BASE_URL = 'https://baza-mennica.example.test/';
process.env.N8N_SHARED_SECRET = 'test-secret';

const {
  buildN8nPayload,
  isAuthorizedN8nRequest
} = require('../src/n8nIntegration');

test('buildN8nPayload exposes answer metadata, audio download, and callback URLs', () => {
  const payload = buildN8nPayload({
    id: 123,
    question_id: 45,
    question_text: 'Jak kupić sztabkę?',
    category_code: 'A',
    category_name: 'Produkty',
    duration_seconds: 81,
    transcript_status: 'pending',
    recorded_at: '2026-04-27 09:00:00'
  });

  assert.equal(payload.event, 'answer.recorded');
  assert.equal(payload.answer_id, 123);
  assert.equal(payload.question_id, 45);
  assert.equal(payload.question, 'Jak kupić sztabkę?');
  assert.equal(payload.category, 'Produkty');
  assert.equal(payload.audio_download_url, 'https://baza-mennica.example.test/integrations/n8n/recordings/123');
  assert.equal(payload.callback_url, 'https://baza-mennica.example.test/integrations/n8n/transcripts');
  assert.equal(payload.auth_header_name, 'X-N8N-Secret');
});

test('isAuthorizedN8nRequest accepts shared secret header or bearer token', () => {
  const byHeader = { get: (name) => (name.toLowerCase() === 'x-n8n-secret' ? 'test-secret' : '') };
  const byBearer = { get: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer test-secret' : '') };
  const wrong = { get: () => 'wrong-secret' };

  assert.equal(isAuthorizedN8nRequest(byHeader), true);
  assert.equal(isAuthorizedN8nRequest(byBearer), true);
  assert.equal(isAuthorizedN8nRequest(wrong), false);
});
