// src/db/seed.js
// Script di seed per popolare il database con dati di esempio.
// Eseguibile con: npm run seed
// Utilizza db.transaction() per garantire atomicità.

import db from './connection.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Numero di round per bcrypt (10 è un buon compromesso sicurezza/velocità)
const SALT_ROUNDS = 10;

// Password comune per tutti gli utenti di test
const plainPassword = 'password123';

const seed = db.transaction(() => {
  // 1. Pulizia completa in ordine (rispetta le chiavi esterne)
  db.exec('DELETE FROM expense_participants');
  db.exec('DELETE FROM expenses');
  db.exec('DELETE FROM group_members');
  db.exec('DELETE FROM groups');
  db.exec('DELETE FROM users');

  // 2. Hash della password comune
  const passwordHash = bcrypt.hashSync(plainPassword, SALT_ROUNDS);

  // 3. Inserimento utenti di test
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

  // ID degli utenti inseriti (lastInsertRowid restituisce un BigInt in alcune versioni)
  const marcoId = Number(marco.lastInsertRowid);
  const giuliaId = Number(giulia.lastInsertRowid);
  const lucaId = Number(luca.lastInsertRowid);
  const sofiaId = Number(sofia.lastInsertRowid);

  const userIds = [marcoId, giuliaId, lucaId, sofiaId];

  // 4. Creazione di 2 gruppi con invite_code univoco
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

  // 5. Aggiunta di tutti e 4 gli utenti come membri di entrambi i gruppi
  const insertMember = db.prepare(
    'INSERT INTO group_members (group_id, user_id) VALUES (@groupId, @userId)'
  );

  for (const userId of userIds) {
    insertMember.run({ groupId: group1Id, userId });
    insertMember.run({ groupId: group2Id, userId });
  }

  // 6. Inserimento spese distribuite tra i gruppi
  const insertExpense = db.prepare(
    'INSERT INTO expenses (group_id, paid_by, description, amount, category) VALUES (@groupId, @paidBy, @description, @amount, @category)'
  );

  const insertParticipant = db.prepare(
    'INSERT INTO expense_participants (expense_id, user_id) VALUES (@expenseId, @userId)'
  );

  // Spesa 1 — Gruppo 1: Marco paga la cena per tutti
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

  // Spesa 2 — Gruppo 1: Giulia paga il taxi
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

  // Spesa 3 — Gruppo 2: Luca paga le bollette
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

  // Spesa 4 — Gruppo 2: Sofia paga la spesa alimentare
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

// Esegui il seed in modo atomico
seed();
