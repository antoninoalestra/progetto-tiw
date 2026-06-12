// Configurazione del database SQLite

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dei percorsi (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'app.db');

// Assicuriamoci che la cartella data esista
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Ottimizzazioni SQLite e integrità referenziale
db.pragma('journal_mode = WAL');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Applica la struttura del db
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

export default db;
