// Popolamento iniziale del database con dati di test (eseguibile con `npm run seed`)

import db from './connection.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
// Password di default per comodità di test
const plainPassword = 'password123';

const seed = db.transaction(() => {
  // Svuotiamo le tabelle partendo da quelle dipendenti (per le foreign keys)
  db.exec('DELETE FROM expense_participants');
  db.exec('DELETE FROM expenses');
  db.exec('DELETE FROM group_members');
  db.exec('DELETE FROM groups');
  db.exec('DELETE FROM users');

  // Prepariamo la password per tutti i finti utenti
  const passwordHash = bcrypt.hashSync(plainPassword, SALT_ROUNDS);

  // Inserimento utenti
  const insertUser = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (@email, @passwordHash, @name)'
  );

  const marco = insertUser.run({
    email: 'marco@example.com',
    passwordHash,
    name: 'Marco Rossi'
  });

  const giulia = insertUser.run({
    email: 'giulia@example.com',
    passwordHash,
    name: 'Giulia Bianchi'
  });

  const luca = insertUser.run({
    email: 'luca@example.com',
    passwordHash,
    name: 'Luca Verdi'
  });

  const sofia = insertUser.run({
    email: 'sofia@example.com',
    passwordHash,
    name: 'Sofia Neri'
  });

  // Recuperiamo gli ID generati
  const marcoId = Number(marco.lastInsertRowid);
  const giuliaId = Number(giulia.lastInsertRowid);
  const lucaId = Number(luca.lastInsertRowid);
  const sofiaId = Number(sofia.lastInsertRowid);

  const userIds = [marcoId, giuliaId, lucaId, sofiaId];

  // Creazione dei gruppi di test
  const insertGroup = db.prepare(
    'INSERT INTO groups (name, description, invite_code, created_by) VALUES (@name, @description, @inviteCode, @createdBy)'
  );

  const group1 = insertGroup.run({
    name: 'Vacanza a Roma',
    description: 'Spese per il weekend a Roma',
    inviteCode: crypto.randomUUID().slice(0, 8),
    createdBy: marcoId
  });

  const group2 = insertGroup.run({
    name: 'Appartamento Condiviso',
    description: 'Spese mensili dell\'appartamento',
    inviteCode: crypto.randomUUID().slice(0, 8),
    createdBy: giuliaId
  });

  const group1Id = Number(group1.lastInsertRowid);
  const group2Id = Number(group2.lastInsertRowid);

  // Aggiungiamo tutti gli utenti a entrambi i gruppi
  const insertMember = db.prepare(
    'INSERT INTO group_members (group_id, user_id) VALUES (@groupId, @userId)'
  );

  for (const userId of userIds) {
    insertMember.run({ groupId: group1Id, userId });
    insertMember.run({ groupId: group2Id, userId });
  }

  // Creiamo qualche spesa di prova distribuita sui gruppi
  const insertExpense = db.prepare(
    'INSERT INTO expenses (group_id, paid_by, description, amount, category) VALUES (@groupId, @paidBy, @description, @amount, @category)'
  );

  const insertParticipant = db.prepare(
    'INSERT INTO expense_participants (expense_id, user_id) VALUES (@expenseId, @userId)'
  );

  // Spesa di Marco nel gruppo 1
  const expense1 = insertExpense.run({
    groupId: group1Id,
    paidBy: marcoId,
    description: 'Cena in trattoria',
    amount: 120.00,
    category: 'Cibo'
  });
  const expense1Id = Number(expense1.lastInsertRowid);
  for (const userId of userIds) {
    insertParticipant.run({ expenseId: expense1Id, userId });
  }

  // Spesa di Giulia nel gruppo 1
  const expense2 = insertExpense.run({
    groupId: group1Id,
    paidBy: giuliaId,
    description: 'Taxi dall\'aeroporto',
    amount: 45.00,
    category: 'Trasporti'
  });
  const expense2Id = Number(expense2.lastInsertRowid);
  for (const userId of userIds) {
    insertParticipant.run({ expenseId: expense2Id, userId });
  }

  // Spesa di Luca nel gruppo 2
  const expense3 = insertExpense.run({
    groupId: group2Id,
    paidBy: lucaId,
    description: 'Bolletta luce marzo',
    amount: 85.50,
    category: 'Generale'
  });
  const expense3Id = Number(expense3.lastInsertRowid);
  for (const userId of userIds) {
    insertParticipant.run({ expenseId: expense3Id, userId });
  }

  // Spesa di Sofia nel gruppo 2
  const expense4 = insertExpense.run({
    groupId: group2Id,
    paidBy: sofiaId,
    description: 'Spesa settimanale',
    amount: 67.30,
    category: 'Spesa'
  });
  const expense4Id = Number(expense4.lastInsertRowid);
  for (const userId of userIds) {
    insertParticipant.run({ expenseId: expense4Id, userId });
  }

  console.log('✅ Seed completato con successo!');
  console.log(`   - ${userIds.length} utenti creati`);
  console.log(`   - 2 gruppi creati`);
  console.log(`   - 4 spese inserite`);
  console.log(`   - Password comune: ${plainPassword}`);
});

// Lanciamo la transazione
seed();
