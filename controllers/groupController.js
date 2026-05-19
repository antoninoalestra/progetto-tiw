import crypto from 'crypto';
import Database from '../models/Database.js';

/**
 * Crea un nuovo gruppo.
 * Riceve name e creatorId dal req.body.
 * Aggiunge il creatore all'array members del gruppo creato.
 */
export const createGroup = async (req, res) => {
  const { name, creatorId } = req.body;

  if (!name || !creatorId) {
    return res.status(400).json({ error: 'Nome del gruppo e creatorId sono obbligatori.' });
  }

  try {
    const data = await Database.readData();

    // Crea un nuovo gruppo con ID univoco e il creatore come primo membro
    const newGroup = {
      id: crypto.randomUUID(),
      name,
      creatorId,
      members: [creatorId]
    };

    data.groups.push(newGroup);
    await Database.writeData(data);

    // Ritorna il gruppo appena creato con stato 201 (Created)
    return res.status(201).json(newGroup);
  } catch (error) {
    console.error('Errore durante la creazione del gruppo:', error);
    return res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Recupera tutti i gruppi di cui l'utente fa parte.
 * Riceve userId dai parametri.
 */
export const getUserGroups = async (req, res) => {
  const { userId } = req.params;

  try {
    const data = await Database.readData();

    // Filtra per restituire solo i gruppi in cui userId è presente nell'array members
    const userGroups = data.groups.filter((group) => group.members.includes(userId));

    return res.status(200).json(userGroups);
  } catch (error) {
    console.error('Errore durante il recupero dei gruppi:', error);
    return res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Aggiunge un utente a un gruppo esistente.
 * Riceve groupId dai parametri ed email dal req.body.
 */
export const addUserToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "L'email è obbligatoria per aggiungere un membro." });
  }

  try {
    const data = await Database.readData();

    // Cerca l'utente tramite l'email fornita
    const user = data.users.find((u) => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato con questa email.' });
    }

    // Cerca il gruppo tramite il groupId
    const groupIndex = data.groups.findIndex((g) => g.id === groupId);

    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Gruppo non trovato.' });
    }

    const group = data.groups[groupIndex];

    // Verifica che l'utente non sia già membro del gruppo
    if (group.members.includes(user.id)) {
      return res.status(400).json({ error: 'Utente già presente nel gruppo.' });
    }

    // Aggiungi l'ID dell'utente all'array members del gruppo
    group.members.push(user.id);
    await Database.writeData(data);

    return res.status(200).json({ message: 'Utente aggiunto al gruppo con successo.', group });
  } catch (error) {
    console.error("Errore durante l'aggiunta dell'utente al gruppo:", error);
    return res.status(500).json({ error: 'Errore interno del server.' });
  }
};
