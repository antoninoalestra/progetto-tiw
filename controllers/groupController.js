import Database from '../models/Database.js';

/**
 * Recupera un gruppo dal suo ID, popolando le informazioni sui membri.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Recupera il gruppo dal database
    const group = await Database.getById('groups', groupId);

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato.' });
    }

    // Recupera tutti gli utenti per popolare le info dei membri del gruppo
    const allUsers = await Database.getAll('users');

    // Popola l'array members
    const populatedMembers = group.members.map(memberId => {
      const user = allUsers.find(u => u.id === memberId);
      // Se l'utente non viene trovato, restituiamo un utente mockato
      return user ? { id: user.id, nome: user.nome } : { id: memberId, nome: 'Utente Sconosciuto' };
    });

    // Crea un nuovo oggetto gruppo con i membri popolati
    const populatedGroup = {
      ...group,
      members: populatedMembers
    };

    res.status(200).json(populatedGroup);
  } catch (error) {
    console.error('Errore durante il recupero del gruppo:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};
