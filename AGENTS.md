# AGENTS.md

## Cel projektu

Zbudować aplikację webową, która pomoże właścicielowi sklepu **mennica.pl** zebrać kompletną bazę wiedzy (pytania + odpowiedzi audio) dla docelowego chatbota obsługującego klientów na stronie internetowej.

Aplikacja działa w modelu „wywiadu sterowanego”: system zadaje właścicielowi sklepu kolejne pytania (takie, jakie mógłby zadać prawdziwy klient), a właściciel odpowiada **głosowo**. Każda para *pytanie + nagranie mp3* trafia do bazy danych. Transkrypcje audio mogą być wygenerowane później przez zewnętrzne narzędzie — w MVP nie są wymagane.

Końcowym efektem ma być uporządkowany zbiór par Q&A, który posłuży jako knowledge base dla chatbota.

---

## Persona użytkownika

Jeden użytkownik aplikacji: **właściciel sklepu mennica.pl** (lub osoba przez niego wyznaczona).

Środowisko pracy: przeglądarka na komputerze lub telefonie. Użytkownik nie jest programistą — interfejs musi być prosty, jednoekranowy, oparty na dużym przycisku nagrywania.

---

## Zakres funkcjonalny (MVP)

### 1. Bank pytań (seed)

Aplikacja startuje z predefiniowaną listą pytań pogrupowanych w kategorie. Pytania są tak sformułowane, jakby zadawał je klient. Lista poniżej to **minimum** do zaszczepienia bazy — agent budujący aplikację powinien załadować ją do tabeli `questions` przy pierwszym uruchomieniu (seed/migracja).

#### Kategoria A — Produkty (sztabki, monety)

1. Jakie sztabki złota można kupić w mennica.pl?
2. Jakie gramatury sztabek złota są dostępne (1 g, 5 g, 10 g, 1 oz, 100 g, 1 kg)?
3. Jakiej próby jest złoto inwestycyjne sprzedawane w mennica.pl?
4. Czy sprzedajecie sztabki srebra? Jakie gramatury?
5. Czy srebro inwestycyjne jest objęte podatkiem VAT? Jakim?
6. Czy oferujecie sztabki platyny i palladu?
7. Jakie monety bulionowe macie w ofercie (Krugerrand, Maple Leaf, Wiedeńscy Filharmonicy, Britannia, Orzeł itp.)?
8. Czy sprzedajecie monety kolekcjonerskie NBP?
9. Czy każda sztabka ma certyfikat producenta (np. Argor-Heraeus, Heraeus, Münze Österreich, PAMP)?
10. Czy sztabki są zapakowane w blistry / certi-card?
11. Skąd pochodzi złoto sprzedawane przez mennica.pl (LBMA Good Delivery)?

#### Kategoria B — Cena, płatność, faktura

12. Jak ustalana jest cena sztabki — czy zmienia się w ciągu dnia?
13. Co ile aktualizowane są ceny na stronie?
14. Jak długo obowiązuje cena po dodaniu produktu do koszyka?
15. Jakie są dostępne formy płatności (przelew zwykły, BLIK, karta, płatność gotówką w punkcie)?
16. Czy mogę zapłacić gotówką? Do jakiej kwoty?
17. Czy wystawiacie fakturę VAT? Czy mogę dostać fakturę na firmę?
18. Czy do zakupu złota inwestycyjnego doliczany jest VAT?
19. Czy są rabaty przy większych zamówieniach?
20. Czy można zarezerwować cenę / zablokować kurs?

#### Kategoria C — Zakup online

21. Jak złożyć zamówienie przez stronę internetową — krok po kroku?
22. Czy muszę zakładać konto, żeby kupić sztabkę?
23. Jakie dane są potrzebne do zakupu online?
24. Czy są limity kwotowe na zakup bez weryfikacji tożsamości (AML)?
25. Kiedy wymagana jest weryfikacja tożsamości i jak ją przeprowadzić?
26. Ile czasu mam na opłacenie zamówienia?
27. Co się dzieje, jeśli nie opłacę zamówienia w terminie?
28. Czy mogę zmienić lub anulować zamówienie po jego złożeniu?
29. Czy dostanę potwierdzenie zamówienia mailem?

#### Kategoria D — Wysyłka i odbiór

30. Jakie są opcje dostawy (kurier, paczkomat, odbiór osobisty, transport wartości)?
31. Ile kosztuje wysyłka kurierska sztabek złota?
32. Czy paczka jest ubezpieczona? Do jakiej kwoty?
33. W jakim czasie realizujecie zamówienie?
34. Czy paczka jest dyskretnie zapakowana (bez logo, bez informacji o zawartości)?
35. Co zrobić, gdy paczka dotrze uszkodzona lub naruszona?
36. Czy mogę śledzić przesyłkę?

#### Kategoria E — Punkt obsługi klienta / odbiór osobisty

37. Gdzie znajduje się punkt obsługi klienta mennica.pl?
38. Jakie są godziny otwarcia punktu?
39. Czy muszę umówić się na wizytę, czy mogę przyjść bez zapowiedzi?
40. Jak umówić wizytę — telefonicznie, mailowo, przez formularz online?
41. Czy w punkcie mogę obejrzeć sztabkę przed zakupem?
42. Czy w punkcie mogę kupić sztabkę „od ręki” (bez wcześniejszego zamówienia)?
43. Czy w punkcie mogę zapłacić gotówką? Do jakiej kwoty?
44. Czy w punkcie mogę odebrać zamówienie złożone wcześniej online?
45. Jakie dokumenty muszę zabrać na spotkanie (dowód osobisty, NIP firmy)?
46. Czy w punkcie mogę sprzedać posiadane sztabki / monety (skup)?
47. Czy jest możliwość rozmowy z doradcą inwestycyjnym?
48. Czy do punktu można przyjść z dzieckiem / osobą towarzyszącą?
49. Czy w punkcie obsługujecie klientów zagranicznych / w języku angielskim?
50. Czy w pobliżu punktu jest parking?

#### Kategoria F — Skup / odsprzedaż

51. Czy odkupujecie sztabki i monety od klientów?
52. Po jakiej cenie skupujecie złoto?
53. Czy muszę mieć certyfikat / blister, żeby sprzedać sztabkę?
54. Czy skupujecie złom złota i srebra (biżuterię, stomatologię)?
55. Jak wygląda procedura skupu — online czy tylko w punkcie?
56. Jak szybko otrzymam pieniądze za sprzedaną sztabkę?

#### Kategoria G — Bezpieczeństwo, prawo, podatki

57. Czy zakup sztabki złota muszę zgłaszać do urzędu skarbowego?
58. Czy od sprzedaży sztabki muszę zapłacić podatek dochodowy?
59. Po jakim czasie sprzedaż sztabki jest zwolniona z podatku?
60. Czy sklep mennica.pl jest podmiotem zobowiązanym AML?
61. Jak przechowywać sztabki w domu — czy macie skrytki / depozyty?
62. Czy oferujecie przechowywanie sztabek (vault, allocated storage)?
63. Czy moje dane osobowe są bezpieczne (RODO)?

#### Kategoria H — Reklamacje, zwroty, kontakt

64. Czy mogę zwrócić sztabkę kupioną online (10/14 dni)?
65. Jakie są warunki zwrotu produktów inwestycyjnych?
66. Jak zgłosić reklamację?
67. W jakim czasie odpowiadacie na zgłoszenia?
68. Jak skontaktować się z obsługą klienta (telefon, email, czat)?
69. W jakich godzinach działa obsługa telefoniczna?

#### Kategoria I — Dla początkujących

70. Czy opłaca się inwestować w złoto w 2026 roku?
71. Od jakiej kwoty można zacząć inwestowanie w złoto?
72. Co jest lepsze na start — sztabka czy moneta?
73. Czym różni się złoto inwestycyjne od kolekcjonerskiego?
74. Czy mogę kupować sztabki regularnie, np. co miesiąc (plan systematyczny)?

> **Uwaga dla agenta:** powyższe pytania to baza startowa. Aplikacja powinna umożliwiać właścicielowi sklepu dodawanie własnych pytań, oznaczanie pytań jako „nieaktualne” oraz zmianę kolejności w ramach kategorii.

---

### 2. Logika sesji

* Aplikacja prezentuje pytania **jedno po drugim**, w kolejności: najpierw pytania bez odpowiedzi, sortowane po kategorii i priorytecie.
* Po nagraniu odpowiedzi pytanie znika z kolejki i pojawia się następne.
* Stan sesji jest **persystentny** — zamknięcie przeglądarki nie powoduje utraty postępu. Po ponownym wejściu właściciel widzi pytanie, na którym skończył.
* Możliwość: „Pomiń to pytanie” (odkłada na koniec kolejki), „Zaznacz jako nieaktualne”, „Edytuj treść pytania”.
* Możliwość ręcznego dodania pytania (np. takiego, które właściciel sam wymyślił po przemyśleniu).
* Licznik postępu: „Odpowiedziano 23/74 (31%)”.

### 3. Nagrywanie odpowiedzi

* Jeden duży przycisk „Nagrywaj”. Klik → start, klik → stop.
* Limit pojedynczego nagrania: 5 minut (parametr w konfiguracji).
* Po zakończeniu: podgląd nagrania (odtwarzacz HTML5), możliwość:
  * **Zapisz** — wysyła plik na serwer i zapisuje rekord w bazie,
  * **Nagraj ponownie** — kasuje i pozwala zacząć od nowa.
* Format pliku: **mp3** (target). Browser nagrywa do `webm/opus` przez `MediaRecorder` API; konwersja do mp3 odbywa się po stronie serwera (`ffmpeg`).
* Jakość: mono, 64–96 kbps wystarczy (głos).

### 4. Brak transkrypcji w MVP

* Aplikacja **nie** wykonuje transkrypcji w momencie nagrania (powód: koszty + istniejące zewnętrzne narzędzie).
* W bazie utrzymane jest pole `transcript TEXT NULL` oraz `transcript_status ENUM('pending','done','skipped')` — gotowe pod późniejszy backfill.
* W panelu admina jest endpoint/przycisk „Eksportuj wszystkie pliki bez transkrypcji do ZIP” — użytkownik wgrywa je do swojej zewnętrznej aplikacji i potem wkleja transkrypty (lub jest to robione przez osobny worker).

### 5. Eksport bazy wiedzy

* Eksport całości do **JSON** i **CSV** (`question`, `category`, `answer_audio_url`, `transcript`, `recorded_at`).
* Eksport do **Markdown** (po jednej parze Q&A, pogrupowane po kategorii) — gotowy format do wrzucenia do RAG / wektorowej bazy chatbota.

---

## Wymagania techniczne

### Stack (rekomendacja)

* **Backend:** Node.js 20 + Express (lub Fastify). Alternatywa: Python + FastAPI — wybór należy do agenta, ale w README należy uzasadnić.
* **Baza danych:** SQLite (MVP, jeden plik na VPS) lub PostgreSQL, jeśli przewidujemy więcej niż jednego użytkownika.
* **Frontend:** prosty SSR (EJS/Pug) lub minimalna SPA (Vanilla JS / Alpine.js). Bez Reacta / Vue, jeśli nie jest to konieczne — celem jest prostota wdrożenia.
* **Storage plików audio:** lokalny katalog `./storage/recordings/` na VPS-ie (z mountowanym dyskiem lub backupem). Plik nazwany `q{question_id}_{timestamp}.mp3`.
* **Konwersja audio:** `ffmpeg` jako zależność systemowa.
* **Auth:** jeden użytkownik, login + hasło (bcrypt) trzymane w `.env` lub w tabeli `users`. Sesja w cookie. Brak rejestracji.

### Schemat bazy danych

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  text TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | answered | skipped | obsolete
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE answers (
  id INTEGER PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id),
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  transcript_status TEXT DEFAULT 'pending', -- pending | done | skipped
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT
);
```

### Endpoints (minimum)

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/` | Ekran sesji — pokazuje następne pytanie + przycisk nagrywania |
| `GET` | `/questions/next` | JSON: następne pytanie do odpowiedzi |
| `POST` | `/answers` | multipart/form-data: `question_id`, `audio` → zapis pliku + rekord |
| `POST` | `/questions/:id/skip` | Odkłada pytanie |
| `POST` | `/questions/:id/obsolete` | Oznacza jako nieaktualne |
| `POST` | `/questions` | Dodaje własne pytanie |
| `GET` | `/admin` | Panel: lista wszystkich pytań + statusów |
| `GET` | `/export.json` / `/export.csv` / `/export.md` | Eksport bazy wiedzy |
| `GET` | `/recordings/:id` | Strumieniuje plik mp3 (z autoryzacją) |
| `POST` | `/login` / `POST /logout` | Auth |

### Wdrożenie na VPS

* Repo zawiera `Dockerfile` + `docker-compose.yml`. Jedno polecenie `docker compose up -d` uruchamia całość.
* `compose` mountuje `./storage` jako wolumen, żeby nagrania przeżyły restart kontenera.
* `nginx` (lub Caddy) jako reverse proxy z HTTPS (Let's Encrypt). W repo przykładowy `Caddyfile`.
* Backup: cron na VPS robi `tar` na katalogu `storage/` + dump bazy raz dziennie do `./backups/`.
* Zmienne środowiskowe w `.env.example`: `PORT`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `MAX_RECORDING_SECONDS`, `BASE_URL`.

### Bezpieczeństwo

* Wszystkie endpointy poza `/login` chronione sesją.
* Walidacja `Content-Type` przy uploadzie audio (whitelist: `audio/webm`, `audio/mp4`, `audio/mpeg`).
* Limit rozmiaru pojedynczego pliku: 25 MB.
* CSRF token na POST-ach.
* HTTPS obowiązkowy w produkcji (nagrywanie z mikrofonu w przeglądarce wymaga secure context).

---

## Definicja gotowości (DoD)

Aplikacja jest gotowa, gdy:

1. Po `docker compose up` na czystym VPS-ie i otwarciu adresu HTTPS — pojawia się ekran logowania.
2. Po zalogowaniu pojawia się pierwsze pytanie z banku 74 pytań i działający przycisk „Nagrywaj”.
3. Można nagrać odpowiedź, odsłuchać, zapisać — plik mp3 leży w `storage/recordings/`, rekord w bazie istnieje.
4. Po odświeżeniu pojawia się **kolejne** pytanie (nie to samo).
5. `/export.md` zwraca poprawnie sformatowany Markdown z dotychczas nagranymi parami Q&A.
6. README zawiera instrukcję wdrożenia, listę zmiennych env, opis backupu i instrukcję późniejszego wstrzykiwania transkrypcji do bazy.

---

## Co JEST poza zakresem MVP

* Automatyczna transkrypcja audio (Whisper, AssemblyAI itp.) — robione zewnętrznie.
* Sam chatbot na stronie mennica.pl — to oddzielny projekt, ten zbiera tylko knowledge base.
* Wielu użytkowników, role, uprawnienia.
* Aplikacja mobilna natywna — wystarczy responsywna strona.
* Integracja z CRM / sklepem mennica.pl.

---

## Wskazówki dla agenta wykonującego implementację

* Zacznij od schematu bazy + seedu pytań — to fundament.
* Frontend trzymaj tak prosty, jak się da. Jeden ekran, duży przycisk, podgląd nagrania.
* Zanim zaczniesz pisać, sprawdź w przeglądarce, że `MediaRecorder` API daje `audio/webm;codecs=opus` — to standard. Konwersję rób serwerowo (`ffmpeg -i in.webm -codec:a libmp3lame -b:a 96k out.mp3`).
* Po implementacji dodaj smoke test: skrypt, który tworzy fałszywą odpowiedź, sprawdza, że plik powstał i że eksport Markdown go zawiera.
* W README opisz **dokładnie**, jak właściciel sklepu (osoba nietechniczna) ma zacząć korzystać po wdrożeniu: jaki adres otworzyć, jakim loginem się zalogować, gdzie kliknąć.
