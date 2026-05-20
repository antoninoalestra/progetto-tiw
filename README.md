<div align="center">
  <img src="https://img.icons8.com/color/96/000000/wallet--v1.png" alt="Qotly Logo">
  <h1>Qotly - Gestione Spese di Gruppo</h1>
  <p><strong>Un'applicazione Web moderna per tracciare le spese condivise e ottimizzare i rimborsi.</strong></p>
  
  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
  [![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
  [![Socket.IO](https://img.shields.io/badge/Socket.IO-RealTime-black.svg)](https://socket.io/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

---

## 📖 Indice
- [Introduzione](#-introduzione)
- [Livello Raggiunto](#-livello-raggiunto-30-e-lode)
- [Funzionalità Implementate](#-funzionalità-implementate)
- [Scelte Architetturali](#-scelte-architetturali)
- [Installazione e Avvio](#-installazione-e-avvio)
- [Credenziali di Test](#-credenziali-di-test)

---

## 🌟 Introduzione
**Qotly** è un'applicazione web sviluppata come progetto per il corso di "Tecnologie Informatiche per il Web". Permette a coinquilini, gruppi di amici in vacanza o colleghi di tenere traccia delle spese condivise, calcolando matematicamente chi deve rimborsare chi, riducendo al minimo il numero di transazioni necessarie (ottimizzazione dei rimborsi).

## 🏆 Livello Raggiunto: 30 e Lode
Il progetto è stato sviluppato per soddisfare pienamente tutti i requisiti del **Livello 1** e del **Livello 2**. Inoltre, per ambire al massimo punteggio, sono state sviluppate **tre distinte estensioni di Livello 3**:
1. **Sincronizzazione Real-Time**: tramite `Socket.io`, le spese inserite da un utente compaiono istantaneamente sugli schermi degli altri partecipanti senza bisogno di ricaricare la pagina.
2. **Esportazione Report Avanzata in PDF**: utilizzando la libreria `pdfkit`, è possibile scaricare un riepilogo finanziario paginato e finemente formattato del gruppo.
3. **Grafici Analitici**: Integrazione di un grafico a torta (`Chart.js`) interattivo per la scomposizione delle spese per categoria.

---

## ✨ Funzionalità Implementate

### Livello 1 (Base)
- ✅ Registrazione e Autenticazione (persistenza su database locale simulato).
- ✅ Creazione di nuovi Gruppi e generazione del Codice Invito.
- ✅ Partecipazione ai gruppi tramite Codice Invito.
- ✅ Inserimento di una nuova Spesa (con importo, descrizione e pagatore).
- ✅ Calcolo automatico e visualizzazione dei saldi di ciascun utente.

### Livello 2 (Avanzato)
- ✅ **Suddivisione Spese Avanzata**: possibilità di selezionare e deselezionare i partecipanti coinvolti in ogni specifica spesa.
- ✅ **Storico Dettagliato**: timeline di tutte le spese effettuate nel gruppo e dei rimborsi pregressi.
- ✅ **Ottimizzazione Rimborsi**: algoritmo matematico che calcola la rete di rimborsi minima (chi deve dare quanto a chi).
- ✅ **Gestione dei Rimborsi**: registrazione di un rimborso per azzerare o ridurre i debiti.
- ✅ **Categorie di Spesa**: classificazione delle spese con icone identificative.

### Livello 3 (Extra)
- 🚀 **Dashboard Live (WebSockets)** per la notifica in tempo reale dell'inserimento di nuove spese e rimborsi.
- 🚀 **Esportazione in PDF** con layout formattato, intestazioni colorate, riepiloghi e tabelle "zebra".
- 🚀 **Grafico a Torta** interattivo nella dashboard per analizzare la distribuzione delle spese per categoria (Cibo, Trasporti, Alloggio, ecc).

---

## 🏗️ Scelte Architetturali

Il progetto aderisce rigorosamente alle regole e best-practices del corso:
1. **Frontend "Vanilla"**: Tutto il design è stato realizzato partendo da zero con **CSS Puro**, utilizzando Flexbox e Grid (assenza totale di framework come Bootstrap o Tailwind). Per la logica lato client è stato usato JavaScript Vanilla con approccio a componenti funzionali e utilizzo massiccio di Fetch API.
2. **Backend Express (MVC)**: Il backend Node.js è strutturato secondo il pattern *Model-View-Controller*. Le logiche di business (come l'algoritmo di calcolo dei rimborsi minimi in `balanceCalculator.js`) sono isolate dalle rotte HTTP. Il progetto fa uso esclusivo di Moduli ES6 (`import`/`export`).
3. **Database Simulata**: Per conformità alle richieste di non utilizzare DBMS esterni (SQL/NoSQL), l'intero stato dell'applicazione è persistito asincronamente in un file JSON locale (`data/db.json`) utilizzando il modulo nativo `fs/promises`.

---

## 🚀 Installazione e Avvio

Assicurati di avere [Node.js](https://nodejs.org/) (versione 18 o superiore) installato sul tuo sistema.

1. **Scarica o clona il repository** e naviga nella cartella del progetto:
   ```bash
   cd progetto-tiw
   ```
2. **Installa le dipendenze** del server (Express, Socket.io, PDFKit, ecc.):
   ```bash
   npm install
   ```
3. **Avvia il server**:
   ```bash
   node .\server.js
   ```
4. **Apri il browser** all'indirizzo:
   [http://localhost:3000](http://localhost:3000)

---

## 🔑 Credenziali di Test

Per facilitare la fase di testing dell'applicativo senza dover necessariamente registrare nuovi utenti, il database precompilato (`db.json`) offre i seguenti profili di test:

| Utente          | Email                    | Password     | Ruolo (es. nei Gruppi)   |
|-----------------|--------------------------|--------------|--------------------------|
| **Marco Rossi** | `marco@example.com`      | `password123`| Admin ("Vacanze Roma")   |
| **Giulia Bianchi**| `giulia@example.com`   | `password123`| Admin ("Spese Casa")     |
| **Luca Verdi**  | `luca@example.com`       | `password123`| Utente normale           |
| **Sofia Neri**  | `sofia@example.com`      | `password123`| Admin ("Regalo Laurea")  |

Prova ad accedere in due finestre diverse con due utenti dello stesso gruppo (es. Marco e Luca) per testare l'algoritmo di **Sincronizzazione in Tempo Reale**!

<p align="center">
  <i>Progetto per Tecnologie Informatiche per il Web</i>
</p>