// Marque manuellement un lead : réponse reçue, opt-out ou bounce.
// Usage : npm run mark -- replied contact@garage-dupont.fr
//         npm run mark -- optout  contact@garage-dupont.fr
//         npm run mark -- bounced contact@garage-dupont.fr
import { db, logEvent, suppress } from '../src/db.js';

const [action, email] = process.argv.slice(2);
const MAP = { replied: 'REPLIED', optout: 'OPTOUT', bounced: 'BOUNCED' };

if (!MAP[action] || !email) {
  console.log('Usage : npm run mark -- <replied|optout|bounced> <email>');
  process.exit(1);
}

const lead = db.prepare(`SELECT * FROM leads WHERE lower(email) = lower(?)`).get(email);
if (!lead) {
  console.log(`Aucun lead avec l'email ${email}`);
  process.exit(1);
}

db.prepare(`UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(MAP[action], lead.id);
logEvent(lead.id, MAP[action], 'marqué manuellement');
if (action !== 'replied') suppress(email, action);

console.log(`✅ ${lead.name} <${email}> → ${MAP[action]}${action !== 'replied' ? ' (ajouté à la liste de suppression)' : ''}`);
if (action === 'replied') console.log('🎉 Les relances sont stoppées pour ce lead. À toi de jouer !');
db.close();
