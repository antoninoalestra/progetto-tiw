# Linee Guida di Sviluppo per l'Agente AI (Jules)

Questo documento definisce le regole architetturali, stilistiche e tecnologiche che l'agente deve seguire rigorosamente durante la generazione e la modifica del codice per il progetto "Gestione Spese di Gruppo".

## 1. Architettura del Progetto
*   **Pattern:** Utilizza rigorosamente l'architettura **MVC (Model-View-Controller)**.
*   **Separazione:** Mantieni una netta separazione tra la logica di business (Controllers), la gestione dei dati (Models) e le interfacce utente (Views/Public).

## 2. Stack Tecnologico
*   **Backend:** Node.js con il framework Express.js.
*   **Frontend:** HTML5, CSS3 puro e Vanilla JavaScript.
*   **Divieti Frontend:** È **severamente vietato** l'uso di framework o librerie CSS esterne (come Bootstrap, Tailwind, ecc.) o framework JavaScript (come React o Vue). Tutto il layout deve essere gestito con Flexbox o CSS Grid personalizzati.

## 3. Gestione dei Dati (Database)
*   **Approccio:** Non utilizzare database esterni (né SQL né NoSQL).
*   **Implementazione:** Simula il database utilizzando un **file JSON locale** (es. `data/db.json`). 
*   **Logica:** I Models devono leggere da questo file tramite il modulo `fs` di Node.js e riscriverlo ad ogni operazione di inserimento, aggiornamento o cancellazione per garantire la persistenza dei dati tra i riavvii del server.

## 4. Standard di Codifica
*   **Moduli:** Utilizza i moduli ES6 (`import` / `export`) in tutto il progetto backend. Assicurati che nel file `package.json` sia presente la dichiarazione `"type": "module"`. Sii coerente ed evita di mescolare ES6 con CommonJS (`require`).
*   **Nomenclatura:** Usa il *camelCase* per variabili e funzioni, e il *PascalCase* per le classi e i modelli.

## 5. Lingua e Documentazione
*   **Commenti:** Il codice è destinato allo studio per un esame universitario. Ogni blocco di logica complessa, le rotte Express e i metodi del controller **devono essere commentati in lingua italiana**.
*   **Chiarezza:** Privilegia la leggibilità del codice rispetto a soluzioni eccessivamente sintetiche (es. evita catene di operatori ternari complessi se un costrutto `if/else` risulta più comprensibile per uno studente).
