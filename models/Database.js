import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Otteniamo la directory corrente (necessario in ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Percorso assoluto al file JSON locale che funge da database
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

/**
 * Classe che gestisce le operazioni di lettura e scrittura sul database JSON locale.
 * Implementa il Data Access Layer (DAL) per il progetto "Gestione Spese di Gruppo".
 */
class Database {
    /**
     * Metodo privato per leggere e fare il parsing del file JSON.
     * @private
     * @returns {Promise<Object>} Restituisce l'oggetto JavaScript rappresentante il contenuto del database.
     *                            In caso di errore, restituisce un oggetto con array vuoti di default.
     */
    async #readData() {
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Errore durante la lettura del file database:', error);
            // In caso di errore (es. file non trovato), ritorna la struttura base
            return { users: [], groups: [], expenses: [], settlements: [] };
        }
    }

    /**
     * Metodo privato per convertire i dati in stringa e sovrascrivere il file JSON.
     * @private
     * @param {Object} data - L'intero oggetto contenente tutti i dati da salvare.
     * @returns {Promise<void>}
     */
    async #writeData(data) {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            await fs.writeFile(DB_PATH, jsonData, 'utf-8');
        } catch (error) {
            console.error('Errore durante la scrittura sul file database:', error);
        }
    }

    /**
     * Recupera tutti gli elementi da una specifica collezione.
     * @param {string} collectionName - Il nome della collezione da cui recuperare i dati (es. 'users', 'groups').
     * @returns {Promise<Array>} Restituisce un array contenente tutti gli oggetti della collezione.
     */
    async getAll(collectionName) {
        const data = await this.#readData();
        return data[collectionName] || [];
    }

    /**
     * Recupera un singolo elemento da una collezione tramite il suo ID univoco.
     * @param {string} collectionName - Il nome della collezione.
     * @param {string} id - L'identificativo univoco dell'elemento.
     * @returns {Promise<Object|null>} Restituisce l'oggetto corrispondente all'ID, oppure null se non trovato.
     */
    async getById(collectionName, id) {
        const items = await this.getAll(collectionName);
        const item = items.find((element) => element.id === id);
        if (item) {
            return item;
        } else {
            return null;
        }
    }

    /**
     * Inserisce un nuovo elemento in una specifica collezione.
     * Genera automaticamente un ID univoco usando crypto.
     * @param {string} collectionName - Il nome della collezione.
     * @param {Object} itemData - I dati dell'oggetto da inserire.
     * @returns {Promise<Object|null>} Restituisce l'oggetto appena creato comprensivo di ID.
     */
    async insert(collectionName, itemData) {
        const data = await this.#readData();

        // Assicura che la collezione esista
        if (!data[collectionName]) {
            data[collectionName] = [];
        }

        // Crea il nuovo oggetto aggiungendo un id univoco generato casualmente
        const newItem = {
            id: crypto.randomUUID(),
            ...itemData
        };

        // Aggiunge il nuovo elemento alla collezione e salva l'intero file
        data[collectionName].push(newItem);
        await this.#writeData(data);

        return newItem;
    }

    /**
     * Aggiorna un elemento esistente in una collezione tramite il suo ID.
     * @param {string} collectionName - Il nome della collezione.
     * @param {string} id - L'identificativo univoco dell'elemento da aggiornare.
     * @param {Object} updatedData - I nuovi dati con cui aggiornare l'oggetto.
     * @returns {Promise<Object|null>} Restituisce l'oggetto aggiornato, oppure null se l'elemento non è stato trovato.
     */
    async update(collectionName, id, updatedData) {
        const data = await this.#readData();
        const collection = data[collectionName];

        if (!collection) {
            return null;
        }

        // Trova l'indice dell'elemento da aggiornare
        const index = collection.findIndex((element) => element.id === id);

        // Se trovato, lo aggiorna preservando l'id originale e sovrascrivendo i campi
        if (index !== -1) {
            collection[index] = { ...collection[index], ...updatedData, id };
            await this.#writeData(data);
            return collection[index];
        } else {
            return null;
        }
    }

    /**
     * Rimuove un elemento da una collezione tramite il suo ID.
     * @param {string} collectionName - Il nome della collezione.
     * @param {string} id - L'identificativo univoco dell'elemento da rimuovere.
     * @returns {Promise<boolean>} Restituisce true se l'elemento è stato rimosso correttamente, false se non trovato.
     */
    async delete(collectionName, id) {
        const data = await this.#readData();
        const collection = data[collectionName];

        if (!collection) {
            return false;
        }

        // Filtra l'array mantenendo solo gli elementi con ID diverso
        const initialLength = collection.length;
        const newCollection = collection.filter((element) => element.id !== id);

        // Se la lunghezza è diminuita, un elemento è stato rimosso e salviamo
        if (newCollection.length < initialLength) {
            data[collectionName] = newCollection;
            await this.#writeData(data);
            return true;
        } else {
            return false;
        }
    }
}

// Esporta un'istanza singola (Singleton pattern per comodità di utilizzo)
export default new Database();
