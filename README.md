# Qotly — Sistema di Gestione Spese di Gruppo

Progetto per il corso di Tecnologie Informatiche per il Web (TIW) — A.A. 2025/2026

---

## Descrizione

Qotly e' un'applicazione web per la gestione delle spese condivise tra gruppi di utenti. Il sistema permette di registrare le spese sostenute dai membri di un gruppo, calcolare i saldi individuali e determinare il piano di rimborsi ottimale, minimizzando il numero di transazioni necessarie per pareggiare i conti.

I casi d'uso tipici includono la gestione delle spese tra coinquilini, la suddivisione dei costi durante viaggi o cene di gruppo e la rendicontazione di spese condivise in contesti lavorativi.

Il progetto implementa la Traccia 6 (Gestione Spese di Gruppo) e copre il Livello 1, il Livello 2 e parzialmente il Livello 3.

---

## Funzionalita' implementate

### Livello 1 — Nucleo funzionale

- Registrazione e autenticazione degli utenti
- Creazione di gruppi con generazione automatica di un codice di invito univoco
- Partecipazione a un gruppo esistente tramite codice di invito
- Inserimento di spese con importo, descrizione, pagatore e partecipanti coinvolti
- Visualizzazione delle spese del gruppo
- Calcolo e visualizzazione del saldo netto di ciascun partecipante
- Dashboard personale con riepilogo di debiti, crediti e spese recenti

### Livello 2 — Funzionalita' avanzate

- Divisione per quote personalizzate: ogni partecipante puo' contribuire con un importo diverso
- Esclusione selettiva di membri da una specifica spesa
- Registrazione di rimborsi tra utenti
- Algoritmo di ottimizzazione dei rimborsi: calcola il numero minimo di transazioni per azzerare tutti i debiti (algoritmo greedy con accoppiamento debitore-creditore massimi)
- Storico dei rimborsi effettuati, separato dai rimborsi suggeriti
- Categorie di spesa (Cibo, Trasporti, Alloggio, Intrattenimento, Materiali, Generale)
- Gestione dei membri del gruppo da parte dell'amministratore (rimozione, chiusura del gruppo)

### Livello 3 — Estensioni

- Esportazione del resoconto finanziario del gruppo in formato PDF (tramite PDFKit), con tabella delle spese, storico dei rimborsi e paginazione automatica
- Grafico interattivo a torta della distribuzione delle spese per categoria (tramite Chart.js)
- Chiusura del gruppo con generazione automatica dei rimborsi consigliati e cancellazione a cascata di spese e rimborsi associati

---

## Stack tecnologico

| Livello | Tecnologie |
|---|---|
| Runtime | Node.js (>= 18.x) |
| Framework backend | Express 5 |
| Frontend | HTML5, CSS3, JavaScript (ES6+, Vanilla) |
| Persistenza | File system JSON (db.json) |
| Generazione PDF | PDFKit |
| Grafici | Chart.js (CDN) |

L'applicazione non utilizza un database relazionale o a documenti esterno: i dati sono persistiti in un unico file `data/db.json`, letto e scritto tramite la classe `Database` in `models/Database.js`. Questo approccio e' intenzionale per rispettare i vincoli del progetto didattico.

---

## Struttura del progetto

```
progetto-tiw/
|-- controllers/
|   |-- expenseController.js    # Logica per la gestione delle spese
|   |-- groupController.js      # Logica per gruppi, membri, PDF
|   |-- settlementController.js # Logica per i rimborsi
|   |-- userController.js       # Logica per registrazione, login, profilo e bilanci
|-- data/
|   |-- db.json                 # File di persistenza dei dati
|-- models/
|   |-- Database.js             # Data Access Layer (lettura/scrittura JSON)
|-- public/
|   |-- css/
|   |   |-- style.css
|   |-- html/
|   |   |-- login.html
|   |   |-- register.html
|   |   |-- dashboard.html
|   |   |-- group.html
|   |-- js/
|       |-- auth.js             # Logica di registrazione e login
|       |-- dashboard.js        # Logica della dashboard personale
|       |-- group.js            # Logica della pagina di gruppo
|       |-- utils.js            # Funzioni condivise (es. gestione sessione)
|-- routes/
|   |-- expenses.js
|   |-- groups.js
|   |-- settlements.js
|   |-- users.js
|-- utils/
|   |-- balanceCalculator.js    # Algoritmi di calcolo saldi e ottimizzazione rimborsi
|-- server.js                   # Entry point dell'applicazione
|-- package.json
```

---

## Prerequisiti

- **Node.js** versione 18 o superiore
- **npm** (incluso con Node.js)

Per verificare le versioni installate:

```bash
node --version
npm --version
```

---

## Installazione e avvio

### 1. Clonare il repository

```bash
git clone https://github.com/antoninoalestra/progetto-tiw.git
cd progetto-tiw
```

### 2. Installare le dipendenze

```bash
npm install
```

Le uniche dipendenze di produzione sono `express` e `pdfkit`. Non e' necessaria alcuna configurazione di database o variabili d'ambiente.

### 3. Avviare il server

```bash
node server.js
```

L'output atteso e':

```
Server HTTP in ascolto sulla porta 3000
```

### 4. Aprire l'applicazione

Aprire un browser e navigare a:

```
http://localhost:3000
```

Il server reindirizza automaticamente alla pagina di login.

---

## Credenziali di test

Il file `data/db.json` include un set di dati preconfigurati per testare tutte le funzionalita'.

| Nome | Email | Password |
|---|---|---|
| Marco Rossi | marco@example.com | password123 |
| Giulia Bianchi | giulia@example.com | password123 |
| Luca Verdi | luca@example.com | password123 |
| Sofia Neri | sofia@example.com | password123 |

I gruppi di test preesistenti includono spese, rimborsi e codici di invito gia' configurati.

Per ripristinare lo stato iniziale dei dati, e' sufficiente sovrascrivere `data/db.json` con il file originale incluso nel repository.

---

## Endpoint API

Tutti gli endpoint sono prefissati con `/api`.

### Utenti — `/api/users`

| Metodo | Percorso | Descrizione |
|---|---|---|
| POST | `/register` | Registra un nuovo utente |
| POST | `/login` | Autenticazione utente |
| PUT | `/:id` | Aggiorna il profilo utente |
| GET | `/:userId/balances` | Restituisce i saldi globali dell'utente su tutti i gruppi |
| GET | `/:userId/expenses` | Restituisce le ultime 5 spese nei gruppi dell'utente |

### Gruppi — `/api/groups`

| Metodo | Percorso | Descrizione |
|---|---|---|
| POST | `/` | Crea un nuovo gruppo |
| POST | `/join` | Unisciti a un gruppo tramite codice di invito |
| GET | `/user/:userId` | Recupera tutti i gruppi di un utente |
| GET | `/:groupId` | Recupera i dettagli di un gruppo |
| GET | `/:groupId/settlements` | Calcola saldi netti e rimborsi suggeriti |
| POST | `/:groupId/export` | Genera e scarica il report PDF del gruppo |
| DELETE | `/:groupId/members/:memberId` | Rimuove un membro (solo admin) |
| DELETE | `/:groupId` | Chiude ed elimina il gruppo (solo admin) |

### Spese — `/api/expenses`

| Metodo | Percorso | Descrizione |
|---|---|---|
| POST | `/` | Aggiunge una nuova spesa al gruppo |
| GET | `/group/:groupId` | Recupera tutte le spese di un gruppo |

### Rimborsi — `/api/settlements`

| Metodo | Percorso | Descrizione |
|---|---|---|
| POST | `/` | Registra un rimborso tra due utenti |

---

## Note implementative

### Autenticazione

Il login restituisce un token casuale generato con `crypto.randomBytes`. Questo token non viene verificato lato server nelle richieste successive: l'identita' dell'utente viene passata tramite i campi `requesterId`/`adminId` nel corpo delle richieste. Questa scelta e' consapevole e rappresenta una semplificazione adatta al contesto didattico del progetto; in un'applicazione di produzione si utilizzerebbe JWT o un meccanismo di sessione server-side.

### Algoritmo di ottimizzazione rimborsi

L'algoritmo implementato in `utils/balanceCalculator.js` calcola prima i saldi netti di ogni utente (crediti meno debiti, considerando anche i rimborsi gia' effettuati), poi applica un approccio greedy iterativo: ad ogni passo accoppia il debitore con il debito maggiore al creditore con il credito maggiore, generando una transazione pari al minimo tra i due importi. Il risultato e' un insieme di transazioni che azzera tutti i saldi con il numero minimo di passaggi.

### Persistenza

Tutte le operazioni di lettura e scrittura sul file `data/db.json` sono gestite dalla classe `Database` in `models/Database.js`, che espone i metodi `getAll`, `getById`, `insert`, `update` e `delete`. Ogni scrittura sovrascrive l'intero file; per applicazioni con carico elevato sarebbe necessario un database dedicato.
