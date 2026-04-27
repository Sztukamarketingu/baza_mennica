# Mennica Knowledge Collector

Aplikacja webowa do zbierania **bazy wiedzy w formie pytanie + odpowiedź audio** dla chatbota obsługującego klientów sklepu **mennica.pl**.

Działa w modelu „wywiadu sterowanego” — system zadaje właścicielowi sklepu kolejne pytania (74 wbudowane + dowolne dodawane ręcznie), a właściciel odpowiada **głosowo** w przeglądarce. Każda para *pytanie + nagranie mp3* trafia do lokalnej bazy danych i lokalnego katalogu plików. Transkrypcje są wstrzykiwane później.

---

## Spis treści

1. [Stack i decyzje techniczne](#stack-i-decyzje-techniczne)
2. [Szybki start lokalnie](#szybki-start-lokalnie)
3. [Wdrożenie na VPS (Docker + Caddy)](#wdrożenie-na-vps-docker--caddy)
4. [Zmienne środowiskowe](#zmienne-środowiskowe)
5. [Jak używa właściciel sklepu (instrukcja kliknięć)](#jak-używa-właściciel-sklepu-instrukcja-kliknięć)
6. [Endpointy](#endpointy)
7. [Eksport bazy wiedzy](#eksport-bazy-wiedzy)
8. [Wstrzykiwanie transkryptów](#wstrzykiwanie-transkryptów)
9. [Backup i odtwarzanie](#backup-i-odtwarzanie)
10. [Smoke test](#smoke-test)
11. [Bezpieczeństwo](#bezpieczeństwo)
12. [FAQ / problemy](#faq--problemy)

---

## Stack i decyzje techniczne

* **Node.js 20 + Express** — minimalny serwer SSR + REST. Wybór nad FastAPI zrobiony świadomie:
  * `MediaRecorder` + frontend współgrają z Node-owym pipelinem upload→ffmpeg bez dodatkowych zależności,
  * jeden runtime (frontend i backend), prostsze wdrożenie,
  * dla jednego użytkownika w MVP niepotrzebny event loop ASGI / async ORM.
* **SQLite** (`better-sqlite3`) — jeden plik, zero administracji, idealne dla MVP z jednym użytkownikiem. Migracja do Postgresa w przyszłości to kwestia wymiany warstwy `src/db.js`.
* **EJS + Vanilla JS** — bez Reacta/Vue, jak prosiłeś. Jedno-ekranowa sesja, duży przycisk nagrywania.
* **`MediaRecorder` → webm/opus** w przeglądarce → upload jako `multipart/form-data` → konwersja do **mp3 (96 kbps mono)** przez systemowe `ffmpeg` na serwerze. Zapis w `storage/recordings/q{question_id}_{timestamp}.mp3`.
* **Auth:** jeden użytkownik z `.env` (`ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` z bcrypt). Sesja w cookie podpisywanym `SESSION_SECRET`, store: `connect-sqlite3` (sesje przeżyją restart).
* **CSRF:** double-submit token w sesji, sprawdzany na każdym POST-cie (form `_csrf` lub nagłówek `X-CSRF-Token`).
* **Wdrożenie:** `docker compose up -d` stawia kontener Node-a + reverse proxy Caddy z automatycznym Let's Encrypt.

---

## Szybki start lokalnie

```bash
# 1) Zależności (wymagane: Node 20, npm, ffmpeg w PATH)
npm install

# 2) Konfiguracja
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Wynik wklej do SESSION_SECRET w .env

# 3) Hasło dla właściciela sklepu (zwróci ADMIN_PASSWORD_HASH)
npm run hash-password -- "TwojeMocneHaslo123"
# Wynik wklej do .env w polu ADMIN_PASSWORD_HASH
# Ustaw też ADMIN_EMAIL na realny e-mail

# 4) Migracja + seed (74 pytania w 9 kategoriach)
npm run init

# 5) Uruchomienie
npm start
# → http://localhost:3000
```

Uwaga: `MediaRecorder` w przeglądarce wymaga **secure context** (HTTPS lub `localhost`). Lokalnie testuj na `http://localhost:3000`, w produkcji **musisz mieć HTTPS**.

---

## Wdrożenie na VPS (Docker + Caddy)

Wymagania: VPS z Dockerem + Docker Compose, port 80/443 otwarty, domena (np. `baza-mennica.aikuznia.cloud`) wskazująca na IP serwera.

```bash
# 1) Klonujesz repo na VPS
git clone <repo> /opt/mennica
cd /opt/mennica

# 2) Konfigurujesz .env
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # → SESSION_SECRET
docker run --rm -it --entrypoint node node:20-alpine -e "require('bcryptjs').hash(process.argv[1],10).then(h=>console.log(h))" "TwojeHaslo"
# Albo lokalnie: npm run hash-password -- "TwojeHaslo"
# Wpisz ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET, BASE_URL=https://twoja-domena, SECURE_COOKIE=true

# 3) Edytuj Caddyfile — zmień domenę i e-mail na własne, jeśli wdrażasz gdzie indziej
nano Caddyfile

# 4) Start z dołączonym Caddy (gdy porty 80/443 są wolne)
docker compose up -d --build

# Alternatywnie: start pod istniejącym Traefikiem na VPS-ie aikuznia.cloud
cp .env.example app.env
# uzupełnij app.env, potem:
docker compose -f docker-compose.traefik.yml up -d --build

# 5) Sprawdź logi
docker compose logs -f app
```

Caddy automatycznie wystawi certyfikat Let's Encrypt na podstawie domeny w `Caddyfile`. Aplikacja Node-a słucha tylko na `127.0.0.1:3000` (zob. `docker-compose.yml`), więc nie da się jej otworzyć z zewnątrz z pominięciem reverse proxy.

Wolumeny:

* `./data` — baza SQLite + sesje (`app.db`, `sessions.sqlite`)
* `./storage` — nagrania mp3 + tymczasowe uploady
* `./backups` — snapshoty z crona

**Restart kontenera nic nie kasuje**, ponieważ `data/` i `storage/` są zamontowane jako wolumeny.

---

## Zmienne środowiskowe

| Klucz | Wymagane | Opis |
|---|---|---|
| `PORT` | nie | Port aplikacji w kontenerze (domyślnie 3000) |
| `SESSION_SECRET` | **tak** | Tajny ciąg, min. 32 bajty losowe |
| `ADMIN_EMAIL` | **tak** | Email do logowania |
| `ADMIN_PASSWORD_HASH` | **tak** | Bcrypt hash hasła (`npm run hash-password -- "haslo"`) |
| `MAX_RECORDING_SECONDS` | nie | Limit pojedynczego nagrania (domyślnie 300 s = 5 min) |
| `BASE_URL` | zalecane | Publiczny URL używany w eksportach (np. `https://baza-mennica.aikuznia.cloud`) |
| `SECURE_COOKIE` | zalecane | `true` w produkcji (HTTPS), `false` lokalnie |
| `FFMPEG_PATH` | nie | Ścieżka do binarki `ffmpeg`, domyślnie `ffmpeg` z PATH |

---

## Jak używa właściciel sklepu (instrukcja kliknięć)

> Ta sekcja jest świadomie napisana językiem dla osoby nietechnicznej.

1. Wejdź na adres podany przez wdrożeniowca (np. `https://baza-mennica.aikuznia.cloud`).
2. Zaloguj się — login i hasło dostałeś osobno.
3. Zobaczysz **jedno pytanie** i duży **czerwony przycisk „Nagrywaj"**.
4. Kliknij **„Nagrywaj"**, opowiedz odpowiedź swoim głosem (możesz mówić swobodnie, jak do klienta przez telefon). Maksymalnie 5 minut na pytanie.
5. Kliknij ponownie, aby zakończyć. Pojawi się odtwarzacz — odsłuchaj.
   * Jeśli chcesz nagrać jeszcze raz: **„Nagraj ponownie"**.
   * Jeśli jest OK: **„Zapisz odpowiedź"** — system konwertuje plik do mp3 i zapisuje. Pojawi się następne pytanie.
6. Pod pytaniem masz też:
   * **„Pomiń to pytanie"** — odkłada na koniec kolejki, wrócisz do niego później.
   * **„Oznacz jako nieaktualne"** — pytanie znika z kolejki na zawsze.
   * **„Edytuj treść pytania"** — jeżeli pytanie sformułowane jest niezgrabnie.
7. Niżej możesz **dodać własne pytanie**, np. takie, które klienci często zadają.
8. W zakładce **„Pytania"** widzisz całą listę z postępem, statusami i odtwarzaczami nagrań. Stąd też wyeksportujesz bazę.
9. Możesz wyjść w środku — wszystko jest zapisywane na bieżąco. Wracając, system pokaże następne pytanie do nagrania.

**Jeśli przeglądarka pyta o mikrofon — kliknij „Pozwól".** Bez tego nagrywanie nie ruszy.

---

## Endpointy

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/` | Ekran sesji — następne pytanie + przycisk |
| `GET` | `/questions/next` | JSON z kolejnym pytaniem |
| `GET` | `/categories.json` | Lista kategorii (do dropdownu) |
| `POST` | `/answers` | `multipart/form-data`: `question_id`, `audio` |
| `POST` | `/questions` | Dodaje własne pytanie |
| `POST` | `/questions/:id/skip` | Odkłada na koniec kolejki |
| `POST` | `/questions/:id/obsolete` | Oznacza jako nieaktualne |
| `POST` | `/questions/:id/edit` | Edycja treści pytania |
| `GET` | `/admin` | Panel z listą wszystkich pytań |
| `GET` | `/export.json` | Eksport JSON |
| `GET` | `/export.csv` | Eksport CSV (UTF-8 + BOM) |
| `GET` | `/export.md` | Eksport Markdown pogrupowany po kategorii |
| `GET` | `/export-pending-zip` | ZIP nagrań bez transkrypcji |
| `GET` | `/recordings/:id` | Strumień mp3 (z autoryzacją sesji) |
| `GET` | `/login` / `POST /login` | Logowanie |
| `POST` | `/logout` | Wylogowanie |
| `GET` | `/healthz` | Healthcheck (publiczny) |

Wszystkie endpointy poza `/login` i `/healthz` wymagają zalogowanej sesji. Wszystkie POST-y wymagają tokenu CSRF (pole `_csrf` lub nagłówek `X-CSRF-Token`).

---

## Eksport bazy wiedzy

* **`/export.json`** — pełna struktura, gotowe pod programatyczne przetwarzanie.
* **`/export.csv`** — gotowe do otwarcia w Excelu (UTF-8 BOM, średnik nie jest używany — separator `,`).
* **`/export.md`** — Markdown pogrupowany po kategoriach, gotowy do wrzucenia do RAG / wektorowej bazy chatbota.
* **`/export-pending-zip`** — paczuje wszystkie pliki mp3, których odpowiedzi nie mają jeszcze transkryptu. Wrzucasz je do swojej zewnętrznej aplikacji do transkrypcji.

URL nagrań w eksportach pochodzi z `BASE_URL` z `.env` (lub z `req.host`, jeśli `BASE_URL` puste).

---

## Wstrzykiwanie transkryptów

Po przepuszczeniu plików mp3 przez zewnętrzne narzędzie do transkrypcji wygeneruj plik JSON w formacie:

```json
[
  { "answer_id": 1, "transcript": "Sprzedajemy sztabki 1g, 5g, 10g..." },
  { "audio_path": "q5_2026-04-27T07-23-54-087Z.mp3", "transcript": "..." }
]
```

Następnie:

```bash
# Lokalnie:
node src/scripts/import-transcripts.js transcripts.json

# Albo na VPS w kontenerze:
docker compose exec app node src/scripts/import-transcripts.js /app/data/transcripts.json
```

Skrypt:

* identyfikuje rekordy po `answer_id` lub po `audio_path`,
* ustawia `transcript_status = 'done'`,
* wypisuje liczbę zaktualizowanych i nieznalezionych.

Kolejny eksport `/export.md` automatycznie zawiera już teksty.

---

## Backup i odtwarzanie

Skrypt `scripts/backup.sh` robi **snapshot bazy** (`sqlite3 VACUUM INTO`) + `tar` z nagraniami i trzyma 14 ostatnich kopii w `./backups/`.

Cron na VPS (codziennie o 3:00 UTC):

```cron
0 3 * * * /opt/mennica/scripts/backup.sh >> /var/log/mennica-backup.log 2>&1
```

Odtwarzanie:

```bash
docker compose down
cp backups/app-20260101T030000Z.db data/app.db
tar -xzf backups/recordings-20260101T030000Z.tar.gz -C storage/
docker compose up -d
```

---

## Smoke test

Po zmianach uruchom:

```bash
npm run smoke-test
```

Skrypt:
1. uruchamia migrację + seed,
2. generuje testowy WAV (sinus 1 s),
3. konwertuje go do mp3 jak prawdziwy upload,
4. wstawia rekord answer + ustawia status pytania na `answered`,
5. generuje eksport Markdown w pamięci i sprawdza, czy zawiera tekst pytania.

Komunikat `[smoke] OK — wszystko działa.` oznacza, że pełen pipeline (DB + ffmpeg + eksport) jest sprawny.

---

## Bezpieczeństwo

* Wszystkie endpointy poza `/login` i `/healthz` chronione sesją.
* CSRF na każdym POST-cie (token w sesji, walidowany w `verifyCsrf`).
* Walidacja `Content-Type` przy uploadzie audio (whitelist `audio/*` + dokładne typy z `MediaRecorder`).
* Limit pliku 25 MB.
* `httpOnly` + `sameSite=lax` + `secure=true` (w produkcji) dla ciasteczka sesji.
* Reverse proxy (Caddy) wymusza HTTPS i HSTS, dodaje `Permissions-Policy: microphone=(self)`.
* `helmet`-podobne nagłówki ustawia sam serwer (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
* Brak rejestracji — jedyne konto to `ADMIN_EMAIL` z `.env`.

---

## FAQ / problemy

**Mikrofon nie działa.**
Otwórz aplikację po HTTPS (lub na `localhost`), zezwól na dostęp do mikrofonu w przeglądarce. W Chrome: ikona kłódki → Ustawienia witryny → Mikrofon: zezwalaj.

**Po kliknięciu „Zapisz" pojawia się błąd 415.**
Twoja przeglądarka nagrała w nietypowym formacie. Sprawdź log serwera (`docker compose logs app`) — jeśli `mimeType` jest spoza listy w `src/routes/answers.js`, dopisz go do `ALLOWED_MIMES` lub zaktualizuj `pickRecordingMime()` we frontendzie.

**Plik nie konwertuje się do mp3.**
Sprawdź, że `ffmpeg` jest dostępny w PATH (`docker compose exec app which ffmpeg`). W obrazie Dockera `ffmpeg` jest preinstalowany w runtime stage.

**Stracę nagrania po `docker compose down -v`.**
`docker compose down` (bez `-v`) zostawia wolumeny. `-v` kasuje **caddy_data/caddy_config**, ale `./storage` i `./data` są zamontowane jako bind mounty z hosta — nie zostaną ruszone.

**Jak dodać drugiego użytkownika?**
W tym MVP użytkownik jest jeden (przez `.env`). W razie potrzeby dopisz rekord do tabeli `users` (z hashem bcrypt) — `findUserByEmail` w `src/auth.js` przeszuka i tabelę, i `.env`.

---

## Co JEST poza zakresem MVP

Zgodnie z `AGENTS.md`:
* automatyczna transkrypcja audio (Whisper, AssemblyAI itp.) — robione zewnętrznie,
* sam chatbot na stronie mennica.pl — to oddzielny projekt,
* wielu użytkowników, role, uprawnienia,
* aplikacja mobilna natywna,
* integracja z CRM / sklepem mennica.pl.
