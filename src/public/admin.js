(function () {
  'use strict';
  const APP = window.__APP__ || {};
  document.querySelectorAll('.js-mark-obsolete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!id) return;
      if (!confirm('Oznaczyć pytanie #' + id + ' jako nieaktualne?')) return;
      btn.disabled = true;
      try {
        const res = await fetch('/questions/' + id + '/obsolete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': APP.csrf },
          body: JSON.stringify({ _csrf: APP.csrf })
        });
        if (!res.ok) throw new Error('Nie udało się oznaczyć pytania.');
        window.location.reload();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll('.js-reset-question').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!id) return;
      const msg = 'Wyczyścić nagrania i transkrypt dla pytania #' + id + ' oraz przywrócić je do kolejki?';
      if (!confirm(msg)) return;
      btn.disabled = true;
      try {
        const res = await fetch('/questions/' + id + '/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': APP.csrf },
          body: JSON.stringify({ _csrf: APP.csrf })
        });
        if (!res.ok) throw new Error('Nie udało się wyczyścić pytania.');
        window.location.reload();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });
})();
