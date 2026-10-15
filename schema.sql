-- D1 (SQLite) schema for online progress sync.
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash   TEXT    NOT NULL UNIQUE,   -- SHA-256 of the sync key; the key itself is never stored
  created_at INTEGER NOT NULL,
  last_seen  INTEGER
);

-- One row per saved localStorage entry; t = when it was last changed (ms), newest wins.
CREATE TABLE IF NOT EXISTS kv (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  k       TEXT    NOT NULL,
  v       TEXT,                         -- NULL = deleted on the device
  t       INTEGER NOT NULL,
  PRIMARY KEY (user_id, k)
);
