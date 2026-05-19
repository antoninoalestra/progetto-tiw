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
   * Inizializza le collezioni se mancano.
   * @returns {Promise<Object>} Un oggetto contenente i dati del database.
   */
  static async readData() {
    let dbData = { users: [], groups: [], expenses: [] };
    try {
      const data = await fs.readFile(dbPath, 'utf8');
      const parsedData = JSON.parse(data);
      dbData = { ...dbData, ...parsedData };
      return dbData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Se il file non esiste, ritorna lo schema di base
        return dbData;
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
   * Ottiene tutti i documenti da una collezione.
   * @param {string} collectionName Il nome della collezione.
   * @returns {Promise<Array>}
   */
  static async getAll(collectionName) {
    const data = await this.readData();
    return data[collectionName] || [];
  }

  /**
   * Ottiene un documento per ID da una collezione.
   * @param {string} collectionName Il nome della collezione.
   * @param {string} id L'ID del documento.
   * @returns {Promise<Object|null>}
   */
  static async getById(collectionName, id) {
    const data = await this.readData();
    const collection = data[collectionName] || [];
    return collection.find((item) => item.id === id) || null;
  }

  /**
   * Inserisce un nuovo documento in una collezione. Genera automaticamente un ID.
   * @param {string} collectionName Il nome della collezione.
   * @param {Object} document Il documento da inserire.
   * @returns {Promise<Object>} Il documento inserito con l'ID.
   */
  static async insert(collectionName, document) {
    const data = await this.readData();
    if (!data[collectionName]) {
      data[collectionName] = [];
    }
    const newDocument = { id: crypto.randomUUID(), ...document };
    data[collectionName].push(newDocument);
    await this.writeData(data);
    return newDocument;
  }

  /**
   * Aggiorna un documento esistente in una collezione.
   * @param {string} collectionName Il nome della collezione.
   * @param {string} id L'ID del documento da aggiornare.
   * @param {Object} updates I campi da aggiornare.
   * @returns {Promise<Object|null>} Il documento aggiornato, o null se non trovato.
   */
  static async update(collectionName, id, updates) {
    const data = await this.readData();
    const collection = data[collectionName] || [];
    const index = collection.findIndex((item) => item.id === id);

    if (index === -1) return null;

    const updatedDocument = { ...collection[index], ...updates, id }; // Mantiene l'ID originale
    data[collectionName][index] = updatedDocument;
    await this.writeData(data);
    return updatedDocument;
  }

  /**
   * Elimina un documento da una collezione.
   * @param {string} collectionName Il nome della collezione.
   * @param {string} id L'ID del documento da eliminare.
   * @returns {Promise<boolean>} true se eliminato, false se non trovato.
   */
  static async delete(collectionName, id) {
    const data = await this.readData();
    const collection = data[collectionName] || [];
    const index = collection.findIndex((item) => item.id === id);

    if (index === -1) return false;

    data[collectionName].splice(index, 1);
    await this.writeData(data);
    return true;
  }
}

export default Database;
