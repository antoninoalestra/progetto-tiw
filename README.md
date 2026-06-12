# Qotly — Sistema Avanzato di Gestione Spese di Gruppo

![Qotly App Overview](https://img.shields.io/badge/Status-Completato-success) ![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js) ![Express](https://img.shields.io/badge/Express-Framework-000000?logo=express)

Qotly è un'applicazione web moderna, fluida e "mobile-first" dedicata alla divisione delle spese. Pensata per gruppi di amici, coinquilini o viaggi di gruppo, permette di tracciare ogni pagamento, calcolare istantaneamente i bilanci e suggerire la via più rapida per pareggiare i conti tramite rimborsi ottimizzati.

Il progetto è sviluppato seguendo rigorosamente l'architettura **MVC (Model-View-Controller)** con un fortissimo focus sulla qualità del codice, sulle performance e su una UI/UX di altissimo livello. 

Progetto realizzato per il corso universitario di Tecnologie Internet e Web (TIW).

---

## Funzionalità Principali

* **Gestione Gruppi:** Creazione e partecipazione a infiniti gruppi tramite codici di invito sicuri alfanumerici a 6 caratteri.
* **Tracking Spese:** Inserimento dettagliato di spese con importi, categorie e descrizioni.
* **Rimborsi Ottimizzati:** Algoritmo avanzato che calcola automaticamente "chi deve a chi", riducendo al minimo il numero di transazioni (rimborsi) per azzerare i debiti tra gli utenti.
* **Autenticazione Sicura:** Login e registrazione con hashing delle password e gestione sicura delle sessioni server-side.
* **Esportazione PDF:** Generazione di report finanziari eleganti, professionali e completi scaricabili direttamente in PDF.
* **UI/UX Premium e Mobile-First:** Design reattivo curato nei minimi dettagli. Supporto perfetto per schermi smartphone (inclusi i notch grazie al `viewport-fit=cover`), prevenzione totale di scroll orizzontali accidentali, e l'utilizzo esclusivo di CSS puro senza framework esterni.

---

## Stack Tecnologico

Il progetto fa uso di moderne tecnologie web, rispettando i vincoli accademici (nessun framework frontend pesante o database esterno cloud).

| Livello | Tecnologie Utilizzate |
|---------|-----------------------|
| **Backend** | Node.js, Express.js |
| **Frontend** | HTML5, CSS3 (Vanilla: Flexbox/Grid, variabili, micro-animazioni), JavaScript ES6+ |
| **View Engine**| Handlebars (`express-handlebars`) per il Server-Side Rendering (SSR) |
| **Database** | SQLite (`better-sqlite3`). **Nota:** Il DB è interamente gestito come file locale (`data/app.db`) |
| **Librerie** | `pdfkit` (Generazione PDF), `bcrypt` (Sicurezza/Hashing), `express-session` (Sessioni) |

---

## Struttura del Database (Schema)

Il database è strutturato su base relazionale utilizzando SQLite. Di seguito i dettagli delle tabelle implementate:

1. **`users`**: Tabella anagrafica degli utenti. Memorizza `id`, `name`, `email` (univoca) e `password_hash` (criptata tramite bcrypt).
2. **`groups`**: Tabella dei gruppi. Memorizza le informazioni del gruppo, tra cui `name`, `description` e l'`invite_code` (univoco e generato dinamicamente). Contiene la foreign key `created_by` verso `users`.
3. **`group_members`**: Tabella di associazione (molti-a-molti) che collega gli utenti ai gruppi di cui fanno parte, con chiave primaria composta (`group_id`, `user_id`).
4. **`expenses`**: Memorizza i dati principali delle transazioni economiche: `group_id`, utente pagante (`paid_by`), `amount`, `description`, `category` e timestamp della spesa.
5. **`expense_participants`**: Tabella di associazione per ripartire le quote. Oltre a collegare `expense_id` e `user_id`, include il campo fondamentale `share_amount` per permettere la divisione con quote personalizzate (se nullo, la spesa è da intendersi in parti uguali).
6. **`reimbursements`**: Storico dei rimborsi fisici effettuati tra due utenti (`from_user_id`, `to_user_id`) all'interno di uno specifico gruppo, con relativo `amount`.

Viene fatto un uso massiccio dei vincoli `ON DELETE CASCADE` per garantire l'integrità referenziale senza lasciare record "orfani" (ad esempio, cancellando un gruppo si cancellano in cascata tutti i suoi membri, spese e rimborsi).

---

## Implementazione della Traccia (Requisiti)

Il progetto copre interamente ed estende tutti i punti richiesti dalla traccia dell'esame. Di seguito la tabella riepilogativa:

| Funzionalità Implementate in Qotly | Livello della Traccia |
|------------------------------------|-----------------------|
| • Registrazione e accesso<br>• Creazione gruppo<br>• Sistema di invito tramite codice<br>• Inserimento spesa<br>• Visualizzazione spese<br>• Visualizzazione saldi | Livello 1 (Sistema Base) |
| • Quote personalizzate ed esclusione membri<br>• Calcolo debiti minimi (Algoritmo Greedy)<br>• Categorie di spesa<br>• Registrazione rimborsi<br>• Storico dettagliato delle operazioni | Livello 2 (Divisioni Avanzate) |
| • Esportazione del riepilogo in PDF (Stream)<br>• Grafici delle spese per categoria | Livello 3 (Estensioni) |

---

## Guida all'Avvio Rapido

### 1. Prerequisiti
Assicurati di avere installato sul tuo sistema:
* [Node.js](https://nodejs.org/) (Richiede esplicitamente versione **>= 20**)
* **npm** (Il package manager, fornito insieme a Node.js)

### 2. Installazione
Clona il repository sul tuo computer e naviga nella cartella del progetto. Quindi, installa tutte le dipendenze:

```bash
git clone https://github.com/antoninoalestra/progetto-tiw.git
cd progetto-tiw
npm install
```

### 3. Popolamento Database (Seed)
Per testare subito le funzionalità senza dover creare utenti da zero, puoi "seminare" (seed) il database con dati predefiniti di prova:

```bash
npm run seed
```

**(Utenti pre-registrati per i test)**
L'esecuzione del seed creerà il file `data/app.db` inserendo i seguenti utenti pronti all'uso:

| Nome Utente | Email (Login) | Password |
|---|---|---|
| Marco Rossi | `marco@example.com` | `password123` |
| Giulia Bianchi | `giulia@example.com` | `password123` |
| Luca Verdi | `luca@example.com` | `password123` |
| Sofia Neri | `sofia@example.com` | `password123` |

### 4. Esecuzione del Server
Avvia il server di sviluppo. Questo comando abilita **nodemon**, riavviando automaticamente l'app in caso di modifiche al codice:

```bash
npm run dev
```

### 5. Utilizzo dell'App
Apri il tuo browser preferito (Chrome, Safari, Firefox, ecc.) e digita il seguente indirizzo:

```text
http://localhost:3000
```
Accedi utilizzando uno degli account elencati nella tabella per testare la piattaforma.

Buona divisione delle spese con Qotly!
