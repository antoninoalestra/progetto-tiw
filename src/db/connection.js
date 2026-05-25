// src/db/connection.js
// Singleton per la connessione al database SQLite tramite better-sqlite3.
// Crea la cartella data/ se non esiste, applica PRAGMA e schema DDL.

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Risoluzione percorsi per ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Percorso del file database
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'app.db');

// Crea la cartella data/ se non esiste
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Apri/crea il database SQLite
const db = new Database(dbPath);

// Attiva WAL mode per migliori prestazioni in lettura concorrente
db.pragma('journal_mode = WAL');

// Attiva le chiavi esterne per garantire integrità referenziale
db.pragma('foreign_keys = ON');

// Leggi e applica lo schema DDL
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

export default db;
