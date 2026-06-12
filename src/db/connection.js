// Modulo di connettività per l'infrastruttura database (SQLite).
// Gestisce l'apertura del driver 'better-sqlite3' e impone configurazioni globali 
// di basso livello tramite PRAGMA.

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dei percorsi (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'app.db');

// Verifica preliminare dell'esistenza del path di destinazione per lo storage persistente.
// Viene allocata automaticamente la directory 'data' qualora risultasse mancante.
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Ottimizzazioni prestazionali e di consistenza dati:
// 1. journal_mode = WAL (Write-Ahead Logging): Aumenta la concorrenza in lettura/scrittura
//    e ottimizza le prestazioni I/O in contesti concorrenti.
// 2. foreign_keys = ON: Applica a livello di engine l'integrità referenziale,
//    abilitando l'utilizzo di vincoli strutturali come ON DELETE CASCADE.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Esecuzione implicita dello schema DDL.
// Verifica la struttura della base dati, creando tabelle e indici necessari
// se non pre-esistenti tramite la sintassi CREATE TABLE IF NOT EXISTS.
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

export default db;
