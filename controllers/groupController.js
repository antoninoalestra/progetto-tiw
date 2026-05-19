import Database from '../models/Database.js';
import { calculateNetBalances, optimizeSettlements } from '../utils/balanceCalculator.js';
import PDFDocument from 'pdfkit';

/**
 * Recupera un gruppo dal suo ID, popolando le informazioni sui membri.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'L\'ID del gruppo è obbligatorio.' });
    }

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
      return user ? { id: user.id, nome: user.nome, cognome: user.cognome } : { id: memberId, nome: 'Utente', cognome: 'Sconosciuto' };
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

/**
 * Calcola e restituisce i rimborsi suggeriti per un gruppo,
 * tenendo conto delle spese e dei rimborsi (settlements) già effettuati.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: 'L\'ID del gruppo è obbligatorio.' });
    }

    // Recupera tutte le spese
    const allExpenses = await Database.getAll('expenses');
    // Filtra le spese del gruppo
    const groupExpenses = allExpenses.filter(e => e.groupId === groupId);

    // Recupera tutti i rimborsi
    const allSettlements = await Database.getAll('settlements');
    // Filtra i rimborsi del gruppo
    const groupSettlements = allSettlements.filter(s => s.groupId === groupId);

    // Calcola i saldi netti tenendo conto sia delle spese sia dei rimborsi
    const netBalances = calculateNetBalances(groupExpenses, groupSettlements);

    // Calcola i rimborsi suggeriti per azzerare i debiti rimanenti
    const suggestedSettlements = optimizeSettlements(netBalances);

    res.status(200).json({
      netBalances,
      suggestedSettlements,
      pastSettlements: groupSettlements
    });
  } catch (error) {
    console.error('Errore durante il calcolo dei rimborsi:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Recupera tutti i gruppi a cui un utente appartiene.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'L\'ID utente è obbligatorio.' });
    }

    // Recupera tutti i gruppi
    const allGroups = await Database.getAll('groups');
    
    // Filtra i gruppi in cui l'utente è presente nell'array members
    const userGroups = allGroups.filter(group => group.members && group.members.includes(userId));

    res.status(200).json(userGroups);
  } catch (error) {
    console.error('Errore durante il recupero dei gruppi dell\'utente:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Crea un nuovo gruppo.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const createGroup = async (req, res) => {
  try {
    const { name, creatorId } = req.body;

    if (!name || !creatorId) {
      return res.status(400).json({ error: 'Nome e creatore sono obbligatori.' });
    }

    // Genera un codice alfanumerico di 6 caratteri
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let inviteCode = '';
    for (let i = 0; i < 6; i++) {
      inviteCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Prepara i dati del nuovo gruppo, includendo il creatore nei membri e come admin
    const newGroupData = {
      name,
      creatorId,
      adminId: creatorId,
      inviteCode,
      members: [creatorId]
    };

    // Inserisce il gruppo nel database
    const newGroup = await Database.insert('groups', newGroupData);

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Errore durante la creazione del gruppo:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Unisciti a un gruppo tramite codice di invito.
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const joinGroup = async (req, res) => {
  try {
    const { userId, inviteCode } = req.body;

    if (!userId || !inviteCode) {
      return res.status(400).json({ error: 'ID utente e codice invito sono obbligatori.' });
    }

    const allGroups = await Database.getAll('groups');
    const group = allGroups.find(g => g.inviteCode === inviteCode.toUpperCase());

    if (!group) {
      return res.status(404).json({ error: 'Codice invito non valido.' });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ error: 'Sei già membro di questo gruppo.' });
    }

    // Aggiungi utente ai membri
    const updatedMembers = [...group.members, userId];
    const updatedGroup = await Database.update('groups', group.id, { members: updatedMembers });

    res.status(200).json({ message: 'Aggiunto al gruppo con successo.', group: updatedGroup });
  } catch (error) {
    console.error('Errore durante l\'unione al gruppo:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Rimuove un membro dal gruppo (solo admin).
 * @param {Object} req - L'oggetto richiesta di Express
 * @param {Object} res - L'oggetto risposta di Express
 */
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { adminId } = req.body; // L'ID di chi fa la richiesta (l'admin)

    if (!adminId) {
      return res.status(400).json({ error: 'L\'ID amministratore è obbligatorio.' });
    }

    const group = await Database.getById('groups', groupId);
    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato.' });
    }

    if (group.adminId !== adminId) {
      return res.status(403).json({ error: 'Solo l\'amministratore può espellere i membri.' });
    }

    if (group.adminId === memberId) {
      return res.status(400).json({ error: 'L\'amministratore non può essere rimosso dal gruppo.' });
    }

    if (!group.members.includes(memberId)) {
      return res.status(400).json({ error: 'L\'utente non è presente in questo gruppo.' });
    }

    const updatedMembers = group.members.filter(id => id !== memberId);
    await Database.update('groups', groupId, { members: updatedMembers });

    res.status(200).json({ message: 'Membro rimosso con successo.' });
  } catch (error) {
    console.error('Errore durante la rimozione del membro:', error);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
};

/**
 * Esporta il resoconto del gruppo in PDF
 */
export const exportGroupPdf = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Database.getById('groups', groupId);
    if (!group) return res.status(404).json({ error: 'Gruppo non trovato.' });

    // Fetch members info
    const users = await Database.getAll('users');
    const membersData = users.filter(u => group.members.includes(u.id));

    // Fetch expenses
    const expenses = await Database.getAll('expenses');
    const groupExpenses = expenses.filter(e => e.groupId === groupId);

    // Fetch settlements
    const settlements = await Database.getAll('settlements');
    const groupSettlements = settlements.filter(s => s.groupId === groupId);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-disposition', `attachment; filename=report_${group.name.replace(/\s+/g, '_')}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // PDF Content
    doc.fontSize(24).fillColor('#6366f1').text(`Report Gruppo: ${group.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#64748b').text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(16).fillColor('#1e293b').text('Spese Effettuate', { underline: true });
    doc.moveDown();
    
    if (groupExpenses.length === 0) {
       doc.fontSize(12).fillColor('#64748b').text('Nessuna spesa registrata.');
    } else {
       groupExpenses.forEach(exp => {
         const payer = membersData.find(u => u.id === exp.payerId)?.nome || 'Sconosciuto';
         const date = new Date(exp.date).toLocaleDateString('it-IT');
         doc.fontSize(12).fillColor('#1e293b').text(`• [${date}] ${exp.description} : `).continued().fillColor('#ef4444').text(`€${exp.amount.toFixed(2)}`, { continued: true }).fillColor('#1e293b').text(` (Pagato da: ${payer})`);
       });
    }

    doc.moveDown(2);
    doc.fontSize(16).fillColor('#1e293b').text('Rimborsi Effettuati', { underline: true });
    doc.moveDown();

    if (groupSettlements.length === 0) {
       doc.fontSize(12).fillColor('#64748b').text('Nessun rimborso registrato.');
    } else {
       groupSettlements.forEach(s => {
         const payer = membersData.find(u => u.id === s.payerId)?.nome || 'Sconosciuto';
         const payee = membersData.find(u => u.id === s.payeeId)?.nome || 'Sconosciuto';
         const date = new Date(s.date).toLocaleDateString('it-IT');
         doc.fontSize(12).fillColor('#1e293b').text(`• [${date}] ${payer} ha rimborsato ${payee} di `).continued().fillColor('#10b981').text(`€${s.amount.toFixed(2)}`);
       });
    }

    doc.end();

  } catch (error) {
    console.error('Errore export PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Errore durante la generazione del PDF' });
    }
  }
};
