(function () {
  'use strict';

  const APP = window.__APP__ || {};

  const card = document.getElementById('qa-card');
  const errorToast = document.getElementById('error-toast');
  const categorySelect = document.getElementById('category_id');
  const addQuestionForm = document.getElementById('add-question-form');
  const newQuestionText = document.getElementById('new-question-text');

  loadCategories();

  if (addQuestionForm) {
    addQuestionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (newQuestionText.value || '').trim();
      const categoryId = parseInt(categorySelect.value, 10);
      if (!text) return;
      try {
        const res = await fetch('/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': APP.csrf },
          body: JSON.stringify({ text, category_id: categoryId, _csrf: APP.csrf })
        });
        if (!res.ok) throw new Error('Nie udało się dodać pytania.');
        toast('Dodano pytanie. Pojawi się na końcu kolejki.', 'success');
        newQuestionText.value = '';
      } catch (err) {
        toast(err.message || 'Błąd dodawania pytania.', 'error');
      }
    });
  }

  if (!card) return;

  const recBtn = document.getElementById('rec-toggle');
  const recLabel = card.querySelector('.rec-label');
  const recStatus = document.getElementById('rec-status');
  const recTimer = document.getElementById('rec-timer');
  const preview = document.getElementById('preview');
  const previewAudio = document.getElementById('preview-audio');
  const btnSave = document.getElementById('btn-save');
  const btnRedo = document.getElementById('btn-redo');
  const btnSkip = document.getElementById('btn-skip');
  const btnObsolete = document.getElementById('btn-obsolete');
  const btnEdit = document.getElementById('btn-edit');
  const questionTextEl = document.getElementById('question-text');

  let mediaRecorder = null;
  let chunks = [];
  let stream = null;
  let recordedBlob = null;
  let recordingMime = '';
  let timerInterval = null;
  let startedAt = 0;
  let stopAutoTimeout = null;

  const MAX_SECONDS = parseInt(APP.maxRecordingSeconds, 10) || 300;
  const questionId = parseInt(card.dataset.questionId, 10);

  recBtn.addEventListener('click', toggleRecord);
  btnSave.addEventListener('click', saveAnswer);
  btnRedo.addEventListener('click', resetRecorder);
  if (btnSkip) btnSkip.addEventListener('click', () => action('/questions/' + questionId + '/skip', 'Pominięto'));
  if (btnObsolete) btnObsolete.addEventListener('click', () => {
    if (!confirm('Oznaczyć to pytanie jako nieaktualne? Nie pojawi się więcej w kolejce.')) return;
    action('/questions/' + questionId + '/obsolete', 'Oznaczono jako nieaktualne');
  });
  if (btnEdit) btnEdit.addEventListener('click', editQuestion);

  const initialSupportMessage = getRecordingSupportMessage();
  if (initialSupportMessage) {
    recStatus.textContent = initialSupportMessage;
  }

  function pickRecordingMime() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    for (const m of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return '';
  }

  async function toggleRecord() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      await startRecording();
    } else if (mediaRecorder.state === 'recording') {
      stopRecording();
    }
  }

  async function startRecording() {
    const supportMessage = getRecordingSupportMessage();
    if (supportMessage) {
      toast(supportMessage, 'error');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
    } catch (err) {
      toast('Nie mam dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.', 'error');
      return;
    }
    recordingMime = pickRecordingMime();
    const opts = recordingMime ? { mimeType: recordingMime } : {};
    try {
      mediaRecorder = new MediaRecorder(stream, opts);
    } catch (err) {
      mediaRecorder = new MediaRecorder(stream);
    }
    chunks = [];
    recordedBlob = null;
    preview.classList.add('hidden');

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const type = (mediaRecorder.mimeType || recordingMime || 'audio/webm').split(';')[0];
      recordedBlob = new Blob(chunks, { type });
      previewAudio.src = URL.createObjectURL(recordedBlob);
      preview.classList.remove('hidden');
      recBtn.dataset.state = 'idle';
      recLabel.textContent = 'Nagrywaj';
      recStatus.textContent = 'Nagranie gotowe — odsłuchaj i zapisz.';
      stopTimer();
      stopStream();
    };

    mediaRecorder.start();
    startedAt = Date.now();
    recBtn.dataset.state = 'recording';
    recLabel.textContent = 'Stop';
    recStatus.textContent = 'Trwa nagrywanie — kliknij, aby zakończyć.';
    startTimer();

    stopAutoTimeout = setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        toast('Osiągnięto limit ' + MAX_SECONDS + ' s — nagranie zakończone automatycznie.', 'success');
        stopRecording();
      }
    }, MAX_SECONDS * 1000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (stopAutoTimeout) {
      clearTimeout(stopAutoTimeout);
      stopAutoTimeout = null;
    }
  }

  function getRecordingSupportMessage() {
    if (!window.isSecureContext) {
      return 'Nagrywanie wymaga HTTPS albo lokalnego adresu http://localhost:3000. Otwórz aplikację przez localhost, nie przez adres IP ani 0.0.0.0.';
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'Ta przeglądarka nie udostępnia dostępu do mikrofonu. Użyj aktualnego Chrome, Edge albo Safari.';
    }
    if (!window.MediaRecorder) {
      return 'Ta przeglądarka nie obsługuje MediaRecorder. Użyj aktualnego Chrome lub Edge.';
    }
    return '';
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      recTimer.textContent = `${mm}:${ss}`;
    }, 250);
  }
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetRecorder() {
    chunks = [];
    recordedBlob = null;
    preview.classList.add('hidden');
    previewAudio.removeAttribute('src');
    recTimer.textContent = '00:00';
    recStatus.textContent = 'Gotowe — kliknij, aby zacząć.';
  }

  async function saveAnswer() {
    if (!recordedBlob) {
      toast('Brak nagrania do zapisania.', 'error');
      return;
    }
    btnSave.disabled = true;
    btnRedo.disabled = true;
    recStatus.textContent = 'Wysyłanie i konwersja do mp3…';

    const ext = (recordedBlob.type || 'audio/webm').includes('ogg')
      ? 'ogg'
      : (recordedBlob.type || 'audio/webm').includes('mp4')
        ? 'mp4'
        : 'webm';

    const fd = new FormData();
    fd.append('question_id', String(questionId));
    fd.append('_csrf', APP.csrf);
    fd.append('audio', recordedBlob, `answer.${ext}`);

    try {
      const res = await fetch('/answers', {
        method: 'POST',
        headers: { 'X-CSRF-Token': APP.csrf },
        body: fd
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Nie udało się zapisać odpowiedzi.');
      }
      toast('Zapisano odpowiedź. Przechodzę do następnego pytania.', 'success');
      setTimeout(loadNextQuestion, 600);
    } catch (err) {
      toast(err.message, 'error');
      btnSave.disabled = false;
      btnRedo.disabled = false;
      recStatus.textContent = 'Błąd zapisu — spróbuj ponownie.';
    }
  }

  async function action(url, successMsg) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': APP.csrf },
        body: JSON.stringify({ _csrf: APP.csrf })
      });
      if (!res.ok) throw new Error('Nie udało się wykonać akcji.');
      toast(successMsg, 'success');
      setTimeout(loadNextQuestion, 400);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function editQuestion() {
    const current = questionTextEl.textContent.trim();
    const next = prompt('Edytuj treść pytania:', current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    fetch('/questions/' + questionId + '/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': APP.csrf },
      body: JSON.stringify({ text: trimmed, _csrf: APP.csrf })
    })
      .then((r) => {
        if (!r.ok) throw new Error('Nie udało się zapisać zmian.');
        questionTextEl.textContent = trimmed;
        toast('Zaktualizowano pytanie.', 'success');
      })
      .catch((err) => toast(err.message, 'error'));
  }

  async function loadNextQuestion() {
    window.location.assign('/');
  }

  async function loadCategories() {
    if (!categorySelect) return;
    try {
      const res = await fetch('/categories.json');
      if (!res.ok) return;
      const cats = await res.json();
      categorySelect.innerHTML = cats
        .map((c) => `<option value="${c.id}">${c.code} — ${escapeHtml(c.name)}</option>`)
        .join('');
    } catch (_) {}
  }

  function toast(msg, type) {
    if (!errorToast) {
      console[type === 'error' ? 'error' : 'log'](msg);
      return;
    }
    errorToast.textContent = msg;
    errorToast.classList.remove('hidden', 'error', 'success');
    errorToast.classList.add(type === 'error' ? 'error' : 'success');
    setTimeout(() => errorToast.classList.add('hidden'), 4500);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
