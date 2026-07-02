import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

export const db = new DatabaseSync(config.dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  sector_label TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating REAL,
  reviews INTEGER,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  -- NEW -> ENRICHED -> QUALIFIED | REJECTED | NO_EMAIL
  -- QUALIFIED -> CONTACTED -> FOLLOWUP_1 -> FOLLOWUP_2 -> EXHAUSTED
  -- terminaux : REPLIED, OPTOUT, BOUNCED
  score INTEGER,
  qualify_reason TEXT,
  hooks TEXT,              -- JSON: accroches de personnalisation trouvées par l'IA
  site_excerpt TEXT,       -- extrait du site pour la personnalisation
  email_subject TEXT,
  email_body TEXT,
  contacted_at TEXT,
  last_touch_at TEXT,
  touches INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE TABLE IF NOT EXISTS suppression (
  email TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  type TEXT NOT NULL,      -- SOURCED, ENRICHED, QUALIFIED, REJECTED, SENT, FOLLOWUP, REPLIED, OPTOUT, BOUNCED, ERROR
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

export function touch(id) {
  db.prepare(`UPDATE leads SET updated_at = datetime('now') WHERE id = ?`).run(id);
}

export function setStatus(id, status) {
  db.prepare(`UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
}

export function logEvent(leadId, type, detail = '') {
  db.prepare(`INSERT INTO events (lead_id, type, detail) VALUES (?, ?, ?)`).run(leadId, type, String(detail).slice(0, 500));
}

export function kvGet(key, fallback = null) {
  const row = db.prepare(`SELECT value FROM kv WHERE key = ?`).get(key);
  return row ? row.value : fallback;
}

export function kvSet(key, value) {
  db.prepare(`INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, String(value));
}

export function isSuppressed(email) {
  if (!email) return false;
  return !!db.prepare(`SELECT 1 FROM suppression WHERE email = ?`).get(email.toLowerCase());
}

export function suppress(email, reason) {
  db.prepare(`INSERT OR IGNORE INTO suppression (email, reason) VALUES (?, ?)`).run(email.toLowerCase(), reason);
}

/** Nombre d'emails envoyés aujourd'hui (heure de Paris) par type */
export function sentToday(types) {
  const placeholders = types.map(() => '?').join(',');
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM events
     WHERE type IN (${placeholders})
       AND date(created_at) = date('now')`
  ).get(...types);
  return row.n;
}

export function counts() {
  const rows = db.prepare(`SELECT status, COUNT(*) AS n FROM leads GROUP BY status`).all();
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}
