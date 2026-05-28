# Relazione Tecnica - Progetto Qotly (Esame TIW)

## 1. Architettura di Sistema

L'applicazione web **Qotly** è stata progettata seguendo in modo rigoroso l'architettura software **MVC (Model-View-Controller)**. Questo pattern architetturale garantisce una netta separazione delle responsabilità (Separation of Concerns), rendendo il codice manutenibile, scalabile e di facile lettura.

- **Models (`src/repositories/`)**: Contengono la logica di accesso ai dati (Data Access Layer). Interagiscono in modo esclusivo e centralizzato con il database, mascherando la complessità delle query SQL dai controller.
- **Controllers (`src/routes/`)**: Espongono le rotte HTTP e gestiscono il flusso applicativo. Si occupano di ricevere le richieste (req), validare l'input, richiamare i model opportuni e decidere quale risposta o vista (res) inviare all'utente, senza mai scrivere direttamente logica SQL.
- **Views (`views/`)**: Gestiscono la logica di presentazione. Realizzate utilizzando il template engine `Handlebars` in ottica **Server-Side Rendering (SSR)**.

### Express 5 e Server-Side Rendering
L'applicazione fa uso dell'ultima versione di Express (Express 5.x) per il routing e la gestione dei middleware. Tutte le pagine vengono generate lato server tramite `express-handlebars`. Questo approccio "tradizionale", rispetto a una Single Page Application (SPA) client-side, incrementa notevolmente le performance iniziali, assicura la compatibilità anche con client meno recenti e non richiede pesanti bundle JavaScript (es. React o Vue).

---

## 2. Scelte di Design e Trade-Offs

### 2.1 Database e Gestione dei Dati
In conformità con i requisiti didattici (che vietano l'uso di server SQL remoti o NoSQL cloud), il progetto adotta **SQLite** come motore di database relazionale, interfacciato tramite la libreria sincrona `better-sqlite3`.
- **Perché `better-sqlite3`?**: A differenza di librerie basate su callback o promises, l'API sincrona di `better-sqlite3` elimina il peso dell'I/O asincrono per applicazioni con bassa concorrenza locale, fornendo performance eccezionali senza l'overhead di connessioni di rete TCP.
- **Assenza di ORM**: Non si è fatto uso di ORM (Object-Relational Mapping). Ogni query è scritta manualmente e ottimizzata per sfruttare esclusivamente i **Prepared Statements**.

### 2.2 Prepared Statements vs ORM
L'uso stringente di *Prepared Statements* (es. `db.prepare('SELECT * FROM users WHERE id = @id')`) rappresenta la linea di difesa principale contro le **SQL Injection**.
- I valori vengono sempre passati come parametri associati al momento dell'esecuzione (`.get()`, `.all()`, `.run()`).
- Questo approccio evita le astrazioni "magiche" di un ORM, garantendo allo sviluppatore il pieno controllo sulle performance e sul piano d'esecuzione della query, requisito essenziale per dimostrare padronanza delle basi di dati relazionali.

### 2.3 Sicurezza e Gestione Sessioni
La sicurezza è stata posta al centro dello sviluppo:
- **Hashing delle Password**: Utilizzo della libreria `bcrypt` (fattore di costo predefinito 10) per cifrare le password degli utenti. In nessun caso le password sono salvate o loggate in chiaro.
- **Sessioni Sicure (`express-session`)**: L'autenticazione è gestita tramite cookie di sessione.
  - Il flag `httpOnly: true` previene gli attacchi XSS (Cross-Site Scripting), impedendo a script JavaScript client-side (es. document.cookie) di accedere al token di sessione.
  - Il flag `sameSite: 'lax'` (o `strict`) mitiga le vulnerabilità di CSRF (Cross-Site Request Forgery) in combinazione con l'uso esclusivo del pattern PRG (Post-Redirect-Get) per qualsiasi mutazione di stato.

---

## 3. Pattern PRG e Gestione Form
Ogni operazione che muta lo stato del database (creazione utente, aggiunta o rimozione di una spesa) è implementata seguendo il pattern **Post-Redirect-Get**.
Questo pattern evita il fastidioso problema del "Reinvia dati modulo" quando un utente ricarica la pagina. A completamento dell'operazione POST, il server risponde con un redirect `302 Found`, trasportando l'eventuale messaggio di esito positivo (o di errore) tramite *Flash Messages* salvati momentaneamente in sessione.
Anche la nuova implementazione di eliminazione della spesa utilizza esclusivamente un form `<form method="POST">`, poiché invocare una cancellazione tramite rotta `GET` esporrebbe l'applicativo a vulnerabilità critiche in cui un attaccante potrebbe forzare la vittima a visitare un URL malevolo.

---

## 4. Algoritmo di Settlement (Rimborsi Ottimizzati)
Il cuore della divisione delle spese è un algoritmo **Greedy** ideato per minimizzare il numero di trasferimenti necessari a pareggiare i saldi di tutti i partecipanti.

### Funzionamento
1. **Calcolo Saldi Netti**: Per ogni utente del gruppo viene calcolato il saldo netto (`soldi_spesi_per_il_gruppo - quota_da_pagare`).
   - *Saldo positivo*: L'utente è in credito (deve ricevere denaro).
   - *Saldo negativo*: L'utente è in debito (deve dare denaro).
2. **Separazione e Ordinamento**: I debitori e i creditori vengono separati in due liste (o un'unica mappa), ordinate per importo assoluto (dai debiti/crediti più grandi ai più piccoli).
3. **Compensazione (Greedy Matching)**:
   - Si seleziona il debitore maggiore e il creditore maggiore.
   - Il debitore paga l'importo minimo tra il suo debito totale e il credito totale del creditore `importo = Math.min(|debito|, credito)`.
   - Si aggiornano i saldi netti di entrambi.
   - Si ripete iterativamente il ciclo finché tutti i saldi raggiungono lo zero (o una tolleranza irrisoria dovuta ad arrotondamenti al centesimo, gestita tramite funzioni di troncamento sicure).

### Vantaggi dell'Algoritmo
Invece di avere rimborsi caotici e intrecciati (A deve a B, B deve a C, C deve ad A), l'algoritmo *Greedy* semplifica il grafo dei flussi di cassa in un **albero minimo di trasferimenti**. Questo assicura l'UX ottimale per gli utenti, riducendo la frizione di dover effettuare dozzine di micro-pagamenti.
