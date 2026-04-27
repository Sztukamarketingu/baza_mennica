# n8n workflow: Mennica audio → transcription → Airtable

## Trigger

Create an n8n **Webhook** node:

```text
Method: POST
Path: mennica-answer-recorded
Production URL: https://<n8n-domain>/webhook/mennica-answer-recorded
```

Set `N8N_WEBHOOK_URL` in the app to that production URL.

The app sends `X-N8N-Secret`. In n8n, verify:

```javascript
$json.headers["x-n8n-secret"] === "<N8N_SHARED_SECRET>"
```

## Expected payload

```json
{
  "event": "answer.recorded",
  "answer_id": 123,
  "question_id": 45,
  "question": "Jak kupić sztabkę?",
  "category_code": "A",
  "category": "Produkty",
  "duration_seconds": 81,
  "transcript_status": "pending",
  "recorded_at": "2026-04-27 09:00:00",
  "audio_download_url": "https://baza-mennica.aikuznia.cloud/integrations/n8n/recordings/123",
  "callback_url": "https://baza-mennica.aikuznia.cloud/integrations/n8n/transcripts",
  "auth_header_name": "X-N8N-Secret"
}
```

## Nodes

Recommended workflow:

```text
Webhook
→ IF: shared secret valid
→ HTTP Request: download MP3 as binary
→ OpenAI transcription: gpt-4o-mini-transcribe
→ Airtable: create/update record
→ HTTP Request: callback transcript to app
```

## HTTP Request: download audio

```text
Method: GET
URL: {{$json.body.audio_download_url}}
Response format: File / Binary
Header:
  X-N8N-Secret: <N8N_SHARED_SECRET>
```

## OpenAI transcription

Recommended model:

```text
gpt-4o-mini-transcribe
```

Expected cost:

```text
$0.003 / minute
74 answers × 2 min avg ≈ $0.44
74 answers × 5 min max ≈ $1.11
```

## Airtable fields

Use these fields:

```text
Question ID
Answer ID
Category
Question
Transcript
Audio URL
Recorded At
Status
```

Map:

```text
Question ID  ← {{$json.body.question_id}}
Answer ID    ← {{$json.body.answer_id}}
Category     ← {{$json.body.category}}
Question     ← {{$json.body.question}}
Transcript   ← output from OpenAI transcription
Audio URL     ← {{$json.body.audio_download_url}}
Recorded At   ← {{$json.body.recorded_at}}
Status        ← transcribed
```

## Callback to app

After Airtable succeeds, call:

```text
Method: POST
URL: {{$json.body.callback_url}}
Header:
  Content-Type: application/json
  X-N8N-Secret: <N8N_SHARED_SECRET>
Body:
{
  "answer_id": {{$json.body.answer_id}},
  "transcript": "<OpenAI transcription text>",
  "transcript_status": "done"
}
```

If transcription fails but you still want to mark it:

```json
{
  "answer_id": 123,
  "transcript": "",
  "transcript_status": "skipped"
}
```
