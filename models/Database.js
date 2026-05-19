import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
      const parsedData = JSON.parse(data);
      if (!parsedData.groups) {
        parsedData.groups = [];
      }
      return parsedData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Se il file non esiste, ritorna uno schema di base
        return { users: [], groups: [] };
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
}

export default Database;
