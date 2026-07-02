// Import manuel de leads depuis un CSV (alternative/complément au sourcing Google Places).
// Format attendu (avec en-tête) : name,sector_label,city,email,website,phone
// Usage : npm run import -- ./mes-leads.csv
import fs from 'node:fs';
import { db, logEvent } from '../src/db.js';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.log('Usage : npm run import -- <fichier.csv>');
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
const header = lines.shift().split(',').map((h) => h.trim().toLowerCase());
const col = (row, name) => {
  const i = header.indexOf(name);
  return i >= 0 ? (row[i] || '').trim() : '';
};

const insert = db.prepare(`
  INSERT OR IGNORE INTO leads (place_id, name, sector, sector_label, city, email, website, phone, status)
  VALUES (?, ?, 'import', ?, ?, ?, ?, ?, ?)
`);

let added = 0;
for (const line of lines) {
  const row = line.split(',');
  const name = col(row, 'name');
  if (!name) continue;
  const email = col(row, 'email') || null;
  const r = insert.run(
    `csv:${name}:${col(row, 'city')}`,
    name,
    col(row, 'sector_label') || 'Professionnel automobile',
    col(row, 'city') || null,
    email,
    col(row, 'website') || null,
    col(row, 'phone') || null,
    email ? 'ENRICHED' : 'NEW'
  );
  if (r.changes > 0) {
    added++;
    logEvent(r.lastInsertRowid, 'SOURCED', 'import CSV');
  }
}
console.log(`✅ ${added} leads importés (les doublons sont ignorés)`);
db.close();
