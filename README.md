# Qotly — Sistema Avanzato di Gestione Spese di Gruppo

![Qotly App Overview](https://img.shields.io/badge/Status-Completato-success) ![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js) ![Express](https://img.shields.io/badge/Express-Framework-000000?logo=express)

Qotly è un'applicazione web moderna, fluida e "mobile-first" dedicata alla divisione delle spese. Pensata per gruppi di amici, coinquilini o viaggi di gruppo, permette di tracciare ogni pagamento, calcolare istantaneamente i bilanci e suggerire la via più rapida per pareggiare i conti tramite rimborsi ottimizzati.

Il progetto è sviluppato seguendo rigorosamente l'architettura **MVC (Model-View-Controller)** con un fortissimo focus sulla qualità del codice, sulle performance e su una UI/UX di altissimo livello. 

Progetto realizzato per il corso universitario di Tecnologie Internet e Web (TIW).

---

## ✨ Funzionalità Principali

* **Gestione Gruppi:** Creazione e partecipazione a infiniti gruppi tramite codici di invito sicuri alfanumerici a 6 caratteri.
* **Tracking Spese:** Inserimento dettagliato di spese con importi, categorie e descrizioni.
* **Rimborsi Ottimizzati:** Algoritmo avanzato che calcola automaticamente "chi deve a chi", riducendo al minimo il numero di transazioni (rimborsi) per azzerare i debiti tra gli utenti.
* **Autenticazione Sicura:** Login e registrazione con hashing delle password e gestione sicura delle sessioni server-side.
* **Esportazione PDF:** Generazione di report finanziari eleganti, professionali e completi scaricabili direttamente in PDF.
* **UI/UX Premium e Mobile-First:** Design reattivo curato nei minimi dettagli. Supporto perfetto per schermi smartphone (inclusi i notch grazie al `viewport-fit=cover`), prevenzione totale di scroll orizzontali accidentali, e l'utilizzo esclusivo di CSS puro senza framework esterni.

---

## 💻 Stack Tecnologico

Il progetto fa uso di moderne tecnologie web, rispettando i vincoli accademici (nessun framework frontend pesante o database esterno cloud).

| Livello | Tecnologie Utilizzate |
|---------|-----------------------|
| **Backend** | Node.js, Express.js |
| **Frontend** | HTML5, CSS3 (Vanilla: Flexbox/Grid, variabili, micro-animazioni), JavaScript ES6+ |
| **View Engine**| Handlebars (`express-handlebars`) per il Server-Side Rendering (SSR) |
| **Database** | SQLite (`better-sqlite3`). **Nota:** Il DB è interamente gestito come file locale (`data/app.db`), agendo come storage serverless persistente (simulazione avanzata di database) |
| **Librerie** | `pdfkit` (Generazione PDF), `bcrypt` (Sicurezza/Hashing), `express-session` (Sessioni) |

### Divieti Rispettati
Come da specifiche, l'applicazione **non utilizza** framework CSS (come Bootstrap o Tailwind) né framework JavaScript (React, Vue, ecc.). Tutto il layout è scritto rigorosamente da zero, enfatizzando le abilità di design "puro". L'interazione coi dati non si appoggia a server SQL/NoSQL esterni, ma rimane locale e portatile nel file system.

---

## 🏗️ Architettura

L'organizzazione del codice segue il pattern **MVC**:
- `src/repositories/`: **(Models)** Interazione col database SQLite, prepared statements per performance ed esecuzione query sicure.
- `src/routes/`: **(Controllers)** Logica di routing, gestione middleware di autenticazione e validazione dei dati.
- `views/`: **(Views)** Template grafici `.hbs` separati tra layout base, componenti parziali (es. toast flash) e singole pagine.
- `public/`: Assets statici (stili CSS modulari e script lato client).

---

## 🚀 Guida all'Avvio Rapido

Segui questi passaggi per scaricare, configurare ed eseguire l'applicazione sul tuo computer.

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

### 3. Popolamento Database (Opzionale ma raccomandato)
Per testare subito le funzionalità senza dover creare utenti da zero, puoi "seminare" (seed) il database con dati predefiniti di prova:

```bash
npm run seed
```
*(Questo comando crea il file `data/app.db` con tabelle, utenti fittizi, gruppi, spese e rimborsi).*

### 4. Esecuzione del Server
Avvia il server di sviluppo. Questo comando abilita **nodemon**, riavviando automaticamente l'app in caso di modifiche al codice:

```bash
npm run dev
```

*(Se vuoi avviare l'app in modalità standard, usa `npm start`).*

### 5. Utilizzo dell'App
Apri il tuo browser preferito (Chrome, Safari, Firefox, ecc.) e digita il seguente indirizzo:

```text
http://localhost:3000
```

Se hai eseguito il comando `seed` al punto 3, puoi accedere con le credenziali di test:
* **Email**: `mario@example.com` (o `giulia@example.com`)
* **Password**: `password123`

---

## 💡 Note aggiuntive per lo studio e la valutazione
Tutto il codice complesso (metodi backend, controller, configurazione del database) è commentato in lingua italiana per favorire la chiarezza e la leggibilità didattica.
Il design punta all'effetto "WOW", con micro-interazioni sui pulsanti, finestre modali fluide dal basso, ombreggiatura dinamica e messaggi toast che fluttuano sullo schermo senza scompaginare il layout.

Buono studio e buona divisione delle spese! 🎉
