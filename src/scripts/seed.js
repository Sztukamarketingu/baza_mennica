'use strict';

const db = require('../db');
const migrate = require('./migrate');

const SEED = [
  {
    code: 'A',
    name: 'Produkty (sztabki, monety)',
    questions: [
      'Jakie sztabki złota można kupić w mennica.pl?',
      'Jakie gramatury sztabek złota są dostępne (1 g, 5 g, 10 g, 1 oz, 100 g, 1 kg)?',
      'Jakiej próby jest złoto inwestycyjne sprzedawane w mennica.pl?',
      'Czy sprzedajecie sztabki srebra? Jakie gramatury?',
      'Czy srebro inwestycyjne jest objęte podatkiem VAT? Jakim?',
      'Czy oferujecie sztabki platyny i palladu?',
      'Jakie monety bulionowe macie w ofercie (Krugerrand, Maple Leaf, Wiedeńscy Filharmonicy, Britannia, Orzeł itp.)?',
      'Czy sprzedajecie monety kolekcjonerskie NBP?',
      'Czy każda sztabka ma certyfikat producenta (np. Argor-Heraeus, Heraeus, Münze Österreich, PAMP)?',
      'Czy sztabki są zapakowane w blistry / certi-card?',
      'Skąd pochodzi złoto sprzedawane przez mennica.pl (LBMA Good Delivery)?'
    ]
  },
  {
    code: 'B',
    name: 'Cena, płatność, faktura',
    questions: [
      'Jak ustalana jest cena sztabki — czy zmienia się w ciągu dnia?',
      'Co ile aktualizowane są ceny na stronie?',
      'Jak długo obowiązuje cena po dodaniu produktu do koszyka?',
      'Jakie są dostępne formy płatności (przelew zwykły, BLIK, karta, płatność gotówką w punkcie)?',
      'Czy mogę zapłacić gotówką? Do jakiej kwoty?',
      'Czy wystawiacie fakturę VAT? Czy mogę dostać fakturę na firmę?',
      'Czy do zakupu złota inwestycyjnego doliczany jest VAT?',
      'Czy są rabaty przy większych zamówieniach?',
      'Czy można zarezerwować cenę / zablokować kurs?'
    ]
  },
  {
    code: 'C',
    name: 'Zakup online',
    questions: [
      'Jak złożyć zamówienie przez stronę internetową — krok po kroku?',
      'Czy muszę zakładać konto, żeby kupić sztabkę?',
      'Jakie dane są potrzebne do zakupu online?',
      'Czy są limity kwotowe na zakup bez weryfikacji tożsamości (AML)?',
      'Kiedy wymagana jest weryfikacja tożsamości i jak ją przeprowadzić?',
      'Ile czasu mam na opłacenie zamówienia?',
      'Co się dzieje, jeśli nie opłacę zamówienia w terminie?',
      'Czy mogę zmienić lub anulować zamówienie po jego złożeniu?',
      'Czy dostanę potwierdzenie zamówienia mailem?'
    ]
  },
  {
    code: 'D',
    name: 'Wysyłka i odbiór',
    questions: [
      'Jakie są opcje dostawy (kurier, paczkomat, odbiór osobisty, transport wartości)?',
      'Ile kosztuje wysyłka kurierska sztabek złota?',
      'Czy paczka jest ubezpieczona? Do jakiej kwoty?',
      'W jakim czasie realizujecie zamówienie?',
      'Czy paczka jest dyskretnie zapakowana (bez logo, bez informacji o zawartości)?',
      'Co zrobić, gdy paczka dotrze uszkodzona lub naruszona?',
      'Czy mogę śledzić przesyłkę?'
    ]
  },
  {
    code: 'E',
    name: 'Punkt obsługi klienta / odbiór osobisty',
    questions: [
      'Gdzie znajduje się punkt obsługi klienta mennica.pl?',
      'Jakie są godziny otwarcia punktu?',
      'Czy muszę umówić się na wizytę, czy mogę przyjść bez zapowiedzi?',
      'Jak umówić wizytę — telefonicznie, mailowo, przez formularz online?',
      'Czy w punkcie mogę obejrzeć sztabkę przed zakupem?',
      'Czy w punkcie mogę kupić sztabkę „od ręki" (bez wcześniejszego zamówienia)?',
      'Czy w punkcie mogę zapłacić gotówką? Do jakiej kwoty?',
      'Czy w punkcie mogę odebrać zamówienie złożone wcześniej online?',
      'Jakie dokumenty muszę zabrać na spotkanie (dowód osobisty, NIP firmy)?',
      'Czy w punkcie mogę sprzedać posiadane sztabki / monety (skup)?',
      'Czy jest możliwość rozmowy z doradcą inwestycyjnym?',
      'Czy do punktu można przyjść z dzieckiem / osobą towarzyszącą?',
      'Czy w punkcie obsługujecie klientów zagranicznych / w języku angielskim?',
      'Czy w pobliżu punktu jest parking?'
    ]
  },
  {
    code: 'F',
    name: 'Skup / odsprzedaż',
    questions: [
      'Czy odkupujecie sztabki i monety od klientów?',
      'Po jakiej cenie skupujecie złoto?',
      'Czy muszę mieć certyfikat / blister, żeby sprzedać sztabkę?',
      'Czy skupujecie złom złota i srebra (biżuterię, stomatologię)?',
      'Jak wygląda procedura skupu — online czy tylko w punkcie?',
      'Jak szybko otrzymam pieniądze za sprzedaną sztabkę?'
    ]
  },
  {
    code: 'G',
    name: 'Bezpieczeństwo, prawo, podatki',
    questions: [
      'Czy zakup sztabki złota muszę zgłaszać do urzędu skarbowego?',
      'Czy od sprzedaży sztabki muszę zapłacić podatek dochodowy?',
      'Po jakim czasie sprzedaż sztabki jest zwolniona z podatku?',
      'Czy sklep mennica.pl jest podmiotem zobowiązanym AML?',
      'Jak przechowywać sztabki w domu — czy macie skrytki / depozyty?',
      'Czy oferujecie przechowywanie sztabek (vault, allocated storage)?',
      'Czy moje dane osobowe są bezpieczne (RODO)?'
    ]
  },
  {
    code: 'H',
    name: 'Reklamacje, zwroty, kontakt',
    questions: [
      'Czy mogę zwrócić sztabkę kupioną online (10/14 dni)?',
      'Jakie są warunki zwrotu produktów inwestycyjnych?',
      'Jak zgłosić reklamację?',
      'W jakim czasie odpowiadacie na zgłoszenia?',
      'Jak skontaktować się z obsługą klienta (telefon, email, czat)?',
      'W jakich godzinach działa obsługa telefoniczna?'
    ]
  },
  {
    code: 'I',
    name: 'Dla początkujących',
    questions: [
      'Czy opłaca się inwestować w złoto w 2026 roku?',
      'Od jakiej kwoty można zacząć inwestowanie w złoto?',
      'Co jest lepsze na start — sztabka czy moneta?',
      'Czym różni się złoto inwestycyjne od kolekcjonerskiego?',
      'Czy mogę kupować sztabki regularnie, np. co miesiąc (plan systematyczny)?'
    ]
  }
];

function seed() {
  migrate();

  const existing = db.prepare('SELECT COUNT(*) AS c FROM questions').get().c;
  if (existing > 0) {
    console.log(`[seed] Pomijam — w bazie już jest ${existing} pytań.`);
    return;
  }

  const insertCategory = db.prepare(
    'INSERT INTO categories (code, name, sort_order) VALUES (?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO questions (category_id, text, status, priority) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    SEED.forEach((cat, catIdx) => {
      const catRes = insertCategory.run(cat.code, cat.name, catIdx);
      const categoryId = catRes.lastInsertRowid;
      cat.questions.forEach((q, i) => {
        insertQuestion.run(categoryId, q, 'pending', i);
      });
    });
  });

  tx();

  const total = db.prepare('SELECT COUNT(*) AS c FROM questions').get().c;
  const cats = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  console.log(`[seed] Załadowano ${cats} kategorii i ${total} pytań.`);
}

if (require.main === module) {
  seed();
}

module.exports = seed;
