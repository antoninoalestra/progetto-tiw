<div align="center">
  <img src="https://img.icons8.com/color/96/000000/wallet--v1.png" alt="Qotly Logo" width="80">
  <h1>Qotly</h1>
  <p><strong>Sistema Avanzato per la Gestione delle Spese di Gruppo</strong></p>
  
  <div>
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white" alt="Express">
    <img src="https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white" alt="Socket.io">
    <img src="https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="Vanilla JS">
  </div>
</div>

---

## Descrizione del Progetto
**Qotly** è un'applicazione web progettata per semplificare il tracciamento delle spese condivise tra gruppi di utenti (es. coinquilini, colleghi o compagni di viaggio). Il sistema integra un algoritmo di ottimizzazione che calcola automaticamente il piano di rimborsi ideale per pareggiare i conti con il minor numero possibile di transazioni finanziarie.

---

## Funzionalità Principali

### Gestione Utenti e Gruppi
* **Autenticazione Sicura**: Registrazione e accesso con persistenza dei dati.
* **Organizzazione in Gruppi**: Creazione di spazi condivisi e partecipazione tramite codici d'invito univoci.
* **Dashboard Personale**: Visualizzazione immediata del bilancio complessivo, debiti e crediti.

### Gestione Finanziaria
* **Tracciamento Spese**: Registrazione dettagliata con categorie, pagatore e partecipanti coinvolti.
* **Ripartizione Granulare**: Possibilità di includere o escludere membri specifici da ogni singola spesa.
* **Ottimizzazione Rimborsi**: Algoritmo per la minimizzazione delle transazioni tra i membri.

### Moduli Avanzati
* **Real-Time Sync**: Aggiornamento istantaneo dell'interfaccia tramite WebSockets.
* **Reporting PDF**: Generazione di report finanziari formattati e pronti per la stampa.
* **Analisi Grafica**: Visualizzazione interattiva della distribuzione delle spese per categoria.

---

## Stack Tecnologico

<table width="100%">
  <tr>
    <td width="50%"><strong>Backend</strong></td>
    <td width="50%">Node.js, Express</td>
  </tr>
  <tr>
    <td><strong>Frontend</strong></td>
    <td>HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript (ES6+)</td>
  </tr>
  <tr>
    <td><strong>Comunicazione</strong></td>
    <td>Socket.io (WebSockets)</td>
  </tr>
  <tr>
    <td><strong>Data Persistence</strong></td>
    <td>File System JSON (Local Storage simulato)</td>
  </tr>
  <tr>
    <td><strong>Librerie Extra</strong></td>
    <td>PDFKit (Report), Chart.js (Grafici)</td>
  </tr>
</table>

---

## Installazione e Avvio

### Prerequisiti
* **Node.js**: versione 18.x o superiore
* **NPM**: incluso con Node.js

### Procedura di Configurazione
1.  **Clonazione**: Entrare nella directory del progetto.
    ```bash
    cd progetto-tiw
    ```
2.  **Dipendenze**: Installare i pacchetti necessari.
    ```bash
    npm install
    ```
3.  **Esecuzione**: Avviare il server locale.
    ```bash
    node server.js
    ```
4.  **Accesso**: Aprire il browser all'indirizzo [http://localhost:3000](http://localhost:3000).

---

## Credenziali di Test

Utilizza questi account preconfigurati per testare le funzionalità di gruppo e la sincronizzazione real-time:

| Utente | Email | Password | Ruolo Esempio |
| :--- | :--- | :--- | :--- |
| **Marco Rossi** | `marco@example.com` | `password123` | Admin (Vacanze Roma) |
| **Giulia Bianchi** | `giulia@example.com` | `password123` | Admin (Spese Casa) |
| **Luca Verdi** | `luca@example.com` | `password123` | Utente Standard |
| **Sofia Neri** | `sofia@example.com` | `password123` | Admin (Regalo Laurea) |

---
<div align="center">
  <p><i>Progetto sviluppato per il corso di Tecnologie Informatiche per il Web</i></p>
</div>
