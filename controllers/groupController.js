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

    // Recupera tutti i gruppi e utenti
    const allGroups = await Database.getAll('groups');
    const allUsers = await Database.getAll('users');
    
    // Filtra i gruppi in cui l'utente è presente nell'array members
    const userGroups = allGroups.filter(group => group.members && group.members.includes(userId));

    // Popola i membri
    const populatedUserGroups = userGroups.map(group => {
      const populatedMembers = group.members.map(memberId => {
        const user = allUsers.find(u => u.id === memberId);
        return user ? { id: user.id, nome: user.nome, cognome: user.cognome } : { id: memberId, nome: 'Utente', cognome: 'Sconosciuto' };
      });
      return { ...group, members: populatedMembers };
    });

    res.status(200).json(populatedUserGroups);
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

    // Fetch data
    const users = await Database.getAll('users');
    const membersData = users.filter(u => group.members.includes(u.id));

    const expenses = await Database.getAll('expenses');
    const groupExpenses = expenses.filter(e => e.groupId === groupId);

    const settlements = await Database.getAll('settlements');
    const groupSettlements = settlements.filter(s => s.groupId === groupId);

    // Create PDF with buffering for pagination
    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    
    res.setHeader('Content-disposition', `attachment; filename=Qotly_Report_${group.name.replace(/\s+/g, '_')}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Coordinate e Misure
    const marginX = 50;
    const usableWidth = doc.page.width - marginX * 2;

    // Helper per controllare la fine della pagina
    function checkPage(heightNeeded = 40) {
      if (doc.y + heightNeeded > doc.page.height - 50) {
        doc.addPage();
        doc.y = 50;
      }
    }

    // --- HEADER ---
    doc.rect(0, 0, doc.page.width, 110).fill('#0f172a');
    doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold').text('Qotly', marginX, 35);
    doc.fontSize(12).fillColor('#94a3b8').font('Helvetica').text('Report Finanziario di Gruppo', marginX, 75);
    
    doc.fontSize(20).fillColor('#3b82f6').font('Helvetica-Bold').text(group.name, 0, 45, { align: 'right', width: doc.page.width - marginX });
    
    doc.y = 140;

    // --- RIASSUNTO METRICHE ---
    const totalExpenses = groupExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    doc.rect(marginX, doc.y, usableWidth, 80).fill('#f8fafc').stroke('#e2e8f0');
    doc.lineWidth(1).rect(marginX, doc.y, usableWidth, 80).stroke();
    
    let summaryY = doc.y + 15;
    doc.fillColor('#64748b').fontSize(11).font('Helvetica-Bold').text('TOTALE SPESE', marginX + 20, summaryY);
    doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text(`€ ${totalExpenses.toFixed(2)}`, marginX + 20, summaryY + 20);

    doc.fillColor('#64748b').fontSize(11).text('MEMBRI', marginX + 220, summaryY);
    doc.fillColor('#0f172a').fontSize(24).text(`${membersData.length}`, marginX + 220, summaryY + 20);

    doc.fillColor('#64748b').fontSize(11).text('DATA EMISSIONE', marginX + 370, summaryY);
    doc.fillColor('#0f172a').fontSize(16).text(`${new Date().toLocaleDateString('it-IT')}`, marginX + 370, summaryY + 25);

    doc.y += 110;

    // --- SPESE TABLE ---
    doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text('Dettaglio Spese', marginX, doc.y);
    doc.y += 15;

    // Table Header
    doc.rect(marginX, doc.y, usableWidth, 25).fill('#e2e8f0');
    let headerY = doc.y + 7;
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold');
    doc.text('DATA', marginX + 10, headerY);
    doc.text('DESCRIZIONE', marginX + 100, headerY);
    doc.text('PAGATO DA', marginX + 320, headerY);
    doc.text('IMPORTO', doc.page.width - marginX - 70, headerY, { width: 60, align: 'right' });
    
    doc.y += 25;

    if (groupExpenses.length === 0) {
       doc.y += 10;
       doc.fillColor('#64748b').font('Helvetica').fontSize(11).text('Nessuna spesa registrata per questo gruppo.', marginX, doc.y);
       doc.y += 20;
    } else {
       doc.font('Helvetica').fontSize(10);
       groupExpenses.forEach((exp, index) => {
         checkPage(30);
         
         // Alternating row background
         if (index % 2 === 0) {
            doc.rect(marginX, doc.y, usableWidth, 25).fill('#f8fafc');
         }
         
         const rowY = doc.y + 7;
         const payer = membersData.find(u => u.id === exp.payerId)?.nome || 'Sconosciuto';
         const date = new Date(exp.date).toLocaleDateString('it-IT');
         
         doc.fillColor('#334155');
         doc.text(date, marginX + 10, rowY);
         const catStr = exp.category ? `[${exp.category}] ` : '';
         doc.text(catStr + exp.description, marginX + 100, rowY, { width: 200, lineBreak: false });
         doc.text(payer, marginX + 320, rowY);
         doc.fillColor('#ef4444').font('Helvetica-Bold').text(`€ ${exp.amount.toFixed(2)}`, doc.page.width - marginX - 70, rowY, { width: 60, align: 'right' });
         
         doc.font('Helvetica');
         doc.y += 25;
       });
    }

    doc.y += 30;
    checkPage(100);

    // --- RIMBORSI TABLE ---
    doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text('Storico Rimborsi', marginX, doc.y);
    doc.y += 15;

    doc.rect(marginX, doc.y, usableWidth, 25).fill('#e2e8f0');
    headerY = doc.y + 7;
    doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold');
    doc.text('DATA', marginX + 10, headerY);
    doc.text('PAGATORE', marginX + 100, headerY);
    doc.text('BENEFICIARIO', marginX + 250, headerY);
    doc.text('IMPORTO', doc.page.width - marginX - 70, headerY, { width: 60, align: 'right' });
    
    doc.y += 25;

    if (groupSettlements.length === 0) {
       doc.y += 10;
       doc.fillColor('#64748b').font('Helvetica').fontSize(11).text('Nessun rimborso registrato per questo gruppo.', marginX, doc.y);
    } else {
       doc.font('Helvetica').fontSize(10);
       groupSettlements.forEach((s, index) => {
         checkPage(30);
         
         if (index % 2 === 0) {
            doc.rect(marginX, doc.y, usableWidth, 25).fill('#f8fafc');
         }
         
         const rowY = doc.y + 7;
         const payer = membersData.find(u => u.id === s.payerId)?.nome || 'Sconosciuto';
         const payee = membersData.find(u => u.id === s.payeeId)?.nome || 'Sconosciuto';
         const date = new Date(s.date).toLocaleDateString('it-IT');
         
         doc.fillColor('#334155');
         doc.text(date, marginX + 10, rowY);
         doc.text(payer, marginX + 100, rowY);
         doc.text(payee, marginX + 250, rowY);
         doc.fillColor('#10b981').font('Helvetica-Bold').text(`€ ${s.amount.toFixed(2)}`, doc.page.width - marginX - 70, rowY, { width: 60, align: 'right' });
         
         doc.font('Helvetica');
         doc.y += 25;
       });
    }

    // --- FOOTER Paginazione ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(9).fillColor('#94a3b8').text(
        `Pagina ${i + 1} di ${range.count}  •  Generato con Qotly`,
        0,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width }
      );
    }

    doc.end();
  } catch (error) {
    console.error('Errore export PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Errore durante la generazione del PDF' });
    }
  }
};
