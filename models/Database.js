import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Ottieni il percorso assoluto della directory corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

class Database {
  /**
   * Legge i dati dal file JSON.
   * @returns {Promise<Object>} Un oggetto contenente i dati del database.
   */
  static async readData() {
    try {
      const data = await fs.readFile(dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Se il file non esiste, ritorna uno schema di base
        return { users: [] };
      }
      throw error;
    }
  }

  /**
   * Scrive i dati nel file JSON.
   * @param {Object} data L'oggetto con i dati da salvare.
   * @returns {Promise<void>}
   */
  static async writeData(data) {
    try {
      await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Errore durante la scrittura del database:', error);
      throw error;
    }
  }

  /**
   * Recupera tutti i record di una collezione.
   * @param {string} collection Nome della collezione (es. 'users', 'expenses').
   * @returns {Promise<Array>}
   */
  static async getAll(collection) {
    const data = await this.readData();
    return data[collection] || [];
  }

  /**
   * Recupera un singolo record per ID.
   * @param {string} collection Nome della collezione.
   * @param {string} id L'ID del record.
   * @returns {Promise<Object|null>}
   */
  static async getById(collection, id) {
    const records = await this.getAll(collection);
    return records.find(record => record.id === id) || null;
  }

  /**
   * Inserisce un nuovo record in una collezione, generando un ID se assente.
   * @param {string} collection Nome della collezione.
   * @param {Object} item L'oggetto da inserire.
   * @returns {Promise<Object>} L'oggetto inserito con l'ID aggiunto.
   */
  static async insert(collection, item) {
    const data = await this.readData();
    if (!data[collection]) {
      data[collection] = [];
    }

    // Genera un UUID univoco usando il modulo nativo crypto di Node.js
    const newItem = { id: crypto.randomUUID(), ...item };
    data[collection].push(newItem);

    await this.writeData(data);
    return newItem;
  }

  /**
   * Aggiorna un record esistente.
   * @param {string} collection Nome della collezione.
   * @param {string} id L'ID del record da aggiornare.
   * @param {Object} updates Oggetto con le proprietà da aggiornare.
   * @returns {Promise<Object|null>} Il record aggiornato, o null se non trovato.
   */
  static async update(collection, id, updates) {
    const data = await this.readData();
    if (!data[collection]) return null;

    const index = data[collection].findIndex(record => record.id === id);
    if (index === -1) return null;

    const updatedItem = { ...data[collection][index], ...updates, id }; // Forza a mantenere l'ID originale
    data[collection][index] = updatedItem;

    await this.writeData(data);
    return updatedItem;
  }

  /**
   * Elimina un record per ID.
   * @param {string} collection Nome della collezione.
   * @param {string} id L'ID del record da eliminare.
   * @returns {Promise<boolean>} True se eliminato, false altrimenti.
   */
  static async delete(collection, id) {
    const data = await this.readData();
    if (!data[collection]) return false;

    const initialLength = data[collection].length;
    data[collection] = data[collection].filter(record => record.id !== id);

    if (data[collection].length !== initialLength) {
      await this.writeData(data);
      return true;
    }

    return false;
  }
}

export default Database;
