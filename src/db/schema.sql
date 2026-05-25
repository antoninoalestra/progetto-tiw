-- schema.sql — Schema DDL completo per Qotly
-- PRAGMA foreign_keys e WAL mode gestiti in connection.js

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  invite_code TEXT    NOT NULL UNIQUE,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  joined_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by     INTEGER NOT NULL REFERENCES users(id),
  description TEXT    NOT NULL,
  amount      REAL    NOT NULL CHECK(amount > 0),
  category    TEXT    NOT NULL DEFAULT 'altro',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expense_participants (
  expense_id   INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  share_amount REAL,
  PRIMARY KEY (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_group
  ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_members_user
  ON group_members(user_id);
