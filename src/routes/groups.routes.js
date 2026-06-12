// Controller di routing per la gestione e visualizzazione delle entità Group.
// Coordina il recupero dei dati dai repository e la conseguente iniezione nei template Handlebars
// per generare l'interfaccia utente (dashboard e dettaglio di gruppo).

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as groupsRepo from '../repositories/groups.repo.js';
import * as expensesRepo from '../repositories/expenses.repo.js';
import * as balancesRepo from '../repositories/balances.repo.js';
import * as reimbursementsRepo from '../repositories/reimbursements.repo.js';
import PDFDocument from 'pdfkit';

const router = Router();
router.use(requireAuth);

// Endpoint (GET) per la visualizzazione della Dashboard utente.
// Fornisce un aggregato generale delle affiliazioni, bilanci parziali e cronologia spese.
router.get('/', (req, res) => {
  const userId = req.session.userId;
  const groups = groupsRepo.listForUser(userId);

  // Calcolo aggregato dei bilanci netti (crediti/debiti) distribuiti su tutti i gruppi attivi
  const dashboardData = balancesRepo.getUserDashboardData(userId, groups);

  // Estrazione dell'estratto conto recente per alimentare il feed delle attività
  const recentExpenses = expensesRepo.listRecentForUser(userId, 10);

  // Estrazione del volume finanziario complessivo gestito dall'utente
  const totalExpenses = expensesRepo.getTotalExpensesForUser(userId);

  res.render('groups/list', {
    title: 'Dashboard',
    groups,
    netBalance: dashboardData.netBalance,
    totalCredit: dashboardData.totalCredit,
    totalOwed: dashboardData.totalOwed,
    balanceDetails: dashboardData.details,
    recentExpenses,
    totalExpenses,
    groupCount: groups.length
  });
});

// Endpoint (GET) per il recupero analitico di un singolo gruppo.
// Popola la vista di dettaglio includendo lo storico transazioni, statisiche di categoria,
// saldi attuali e i rimborsi suggeriti.
router.get('/:id', (req, res, next) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return next();

  // Controllo autorizzativo: previene accessi a gruppi di cui non si è membri
  if (!groupsRepo.isMember(groupId, req.session.userId)) {
    return res.status(403).render('errors/404', {
      title: 'Accesso negato',
      message: 'Non sei membro di questo gruppo.'
    });
  }

  const group = groupsRepo.findById(groupId);
  if (!group) return next();

  const expenses = expensesRepo.listForGroup(groupId);
  const balances = balancesRepo.getBalances(groupId);
  const settlements = balancesRepo.calculateSettlements(balances);
  const categoryStats = expensesRepo.getCategoryStats(groupId);
  const reimbursements = reimbursementsRepo.listForGroup(groupId);

  res.render('groups/detail', {
    title: group.name,
    group,
    expenses,
    balances,
    settlements,
    reimbursements,
    categoryStats,
    isCreator: group.created_by === req.session.userId,
    creatorId: group.created_by,
    // Serializzazione dei payload informativi in formato JSON per l'iniezione
    // diretta nel DOM, consentendo alle logiche frontend (vanilla/Chart.js) di operare 
    // sui dati senza invocare API addizionali in fase di inizializzazione.
    groupJson: JSON.stringify(group),
    membersJson: JSON.stringify(group.members),
    categoryStatsJson: JSON.stringify(categoryStats)
  });
});

// Endpoint (GET) per la generazione asincrona di un report PDF.
// Sintetizza i bilanci finali, l'estratto conto e le istruzioni di rimborso (settlements)
// utilizzando la libreria pdfkit.
router.get('/:id/report', (req, res, next) => {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) return next();

  if (!groupsRepo.isMember(groupId, req.session.userId)) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  const group = groupsRepo.findById(groupId);
  if (!group) return next();

  const expenses = expensesRepo.listForGroup(groupId);
  const balances = balancesRepo.getBalances(groupId);

  const settlements = balancesRepo.calculateSettlements(balances);

  // Inizializzazione dell'istanza PDFDocument. 
  // Configurazione dei margini azzerata per permettere rendering edge-to-edge dell'header.
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });

  const safeName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Qotly_${safeName}.pdf`);
  doc.pipe(res);

  // Colori base per il PDF
  const primary = '#4F46E5';
  const primaryDark = '#312E81';
  const textDark = '#0F172A';
  const textMuted = '#64748B';
  const border = '#E2E8F0';
  const bgLight = '#F8FAFC';
  const bgCard = '#FFFFFF';
  const success = '#10B981';
  const danger = '#EF4444';

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginX = 50;
  const contentWidth = pageWidth - (marginX * 2);

  // Funzione d'appoggio per disegnare linee di separazione
  const drawLine = (y, color = border) => {
    doc.moveTo(marginX, y).lineTo(pageWidth - marginX, y).stroke(color);
  };

  // Intestazione principale del PDF
  doc.rect(0, 0, pageWidth, 160).fill(primaryDark);
  
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#FFFFFF').text('Qotly', marginX, 40);
  doc.fontSize(12).font('Helvetica').fillColor('#A5B4FC').text('RESOCONTO SPESE DI GRUPPO', marginX, 50, { align: 'right' });
  
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#FFFFFF').text(group.name, marginX, 90);
  if (group.description) {
    doc.fontSize(12).font('Helvetica-Oblique').fillColor('#C7D2FE').text(group.description, marginX, 120);
  }

  doc.y = 180;

  // Box informativi (Dettagli e Riepilogo)
  const cardY = doc.y;
  const cardWidth = (contentWidth - 20) / 2;
  
  // Box 1: Dettagli Gruppo
  doc.roundedRect(marginX, cardY, cardWidth, 80, 8).fill(bgLight);
  doc.roundedRect(marginX, cardY, cardWidth, 80, 8).stroke(border);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(textMuted).text('DETTAGLI GRUPPO', marginX + 15, cardY + 15);
  doc.fontSize(11).font('Helvetica').fillColor(textDark);
  doc.text(`Data Emissione:`, marginX + 15, cardY + 35).font('Helvetica-Bold').text(new Date().toLocaleDateString('it-IT'), marginX + 100, cardY + 35);
  doc.font('Helvetica').text(`Codice Invito:`, marginX + 15, cardY + 50).font('Helvetica-Bold').text(group.invite_code, marginX + 100, cardY + 50);

  // Box 2: Totale speso
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  doc.roundedRect(marginX + cardWidth + 20, cardY, cardWidth, 80, 8).fill(bgLight);
  doc.roundedRect(marginX + cardWidth + 20, cardY, cardWidth, 80, 8).stroke(border);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(textMuted).text('RIEPILOGO FINANZIARIO', marginX + cardWidth + 35, cardY + 15);
  doc.fontSize(11).font('Helvetica').fillColor(textDark);
  doc.text(`Totale Spese:`, marginX + cardWidth + 35, cardY + 35);
  doc.fontSize(18).font('Helvetica-Bold').fillColor(primary).text(`€${totalAmount.toFixed(2)}`, marginX + cardWidth + 35, cardY + 50);

  doc.y = cardY + 110;

  // Elenco dei partecipanti
  doc.fontSize(14).font('Helvetica-Bold').fillColor(textDark).text('Membri del Gruppo', marginX, doc.y);
  doc.moveDown(0.5);
  
  let memberText = '';
  group.members.forEach((m) => {
    const role = m.id === group.created_by ? ' (Admin)' : '';
    memberText += `• ${m.name}${role}    `;
  });
  doc.fontSize(11).font('Helvetica').fillColor(textMuted).text(memberText, marginX, doc.y, { width: contentWidth, lineGap: 4 });
  doc.moveDown(2);

  // Tabella analitica delle spese
  doc.fontSize(14).font('Helvetica-Bold').fillColor(textDark).text('Dettaglio Spese', marginX, doc.y);
  doc.moveDown(0.5);
  
  // Disegna l'intestazione della tabella
  const tableTop = doc.y;
  doc.roundedRect(marginX, tableTop, contentWidth, 24, 4).fill(primary);
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
  doc.text('DATA', marginX + 10, tableTop + 7);
  doc.text('DESCRIZIONE', marginX + 80, tableTop + 7);
  doc.text('PAGATO DA', marginX + 220, tableTop + 7);
  doc.text('CATEGORIA', marginX + 330, tableTop + 7);
  doc.text('IMPORTO', marginX + 410, tableTop + 7, { width: 75, align: 'right' });
  
  doc.y = tableTop + 24;

  if (expenses.length > 0) {
    let isGray = false;
    for (const exp of expenses) {
      if (doc.y > pageHeight - 100) {
        doc.addPage();
        doc.y = marginX;
      }
      
      const rowY = doc.y;
      if (isGray) doc.rect(marginX, rowY, contentWidth, 24).fill(bgLight);
      isGray = !isGray;
      
      doc.fillColor(textDark).fontSize(9).font('Helvetica');
      doc.text(new Date(exp.created_at).toLocaleDateString('it-IT'), marginX + 10, rowY + 7);
      doc.font('Helvetica-Bold').text(exp.description.substring(0, 28), marginX + 80, rowY + 7);
      doc.font('Helvetica').text(exp.payer_name.substring(0, 20), marginX + 220, rowY + 7);
      doc.fillColor(textMuted).text(exp.category, marginX + 330, rowY + 7);
      doc.fillColor(textDark).font('Helvetica-Bold').text(`€${exp.amount.toFixed(2)}`, marginX + 410, rowY + 7, { width: 75, align: 'right' });
      
      doc.y = rowY + 24;
    }
  } else {
    doc.moveDown();
    doc.fillColor(textMuted).font('Helvetica-Oblique').text('Nessuna spesa registrata.', marginX);
  }

  doc.moveDown(2);

  // Resoconto debiti/crediti finali
  if (doc.y > pageHeight - 150) { doc.addPage(); doc.y = marginX; }
  
  doc.fontSize(14).font('Helvetica-Bold').fillColor(textDark).text('Istruzioni di Rimborso', marginX, doc.y);
  doc.moveDown(0.5);
  
  if (settlements.length > 0) {
    for (const s of settlements) {
      if (doc.y > pageHeight - 80) { doc.addPage(); doc.y = marginX; }
      const setY = doc.y;
      doc.roundedRect(marginX, setY, contentWidth, 36, 6).fill(bgLight);
      doc.roundedRect(marginX, setY, contentWidth, 36, 6).stroke(border);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor(textDark);
      doc.text(s.from, marginX + 15, setY + 12);
      
      doc.font('Helvetica').fillColor(textMuted).text('deve rimborsare a', marginX + 150, setY + 12);
      
      doc.font('Helvetica-Bold').fillColor(textDark).text(s.to, marginX + 260, setY + 12);
      
      doc.fontSize(14).font('Helvetica-Bold').fillColor(danger).text(`€${s.amount.toFixed(2)}`, marginX, setY + 11, { width: contentWidth - 15, align: 'right' });
      
      doc.y = setY + 44;
    }
  } else {
    doc.fontSize(11).font('Helvetica-Oblique').fillColor(success).text('Tutti i conti sono perfettamente in pari. Nessun rimborso necessario.', marginX);
  }

  // Applica il footer numerato a ogni pagina del PDF
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    const bottomY = pageHeight - 40;
    drawLine(bottomY - 10);
    doc.fontSize(8).font('Helvetica').fillColor(textMuted)
       .text(`Qotly — Pagina ${i + 1} di ${pages.count}`, marginX, bottomY, { align: 'center', width: contentWidth });
  }

  doc.end();
});

export default router;
