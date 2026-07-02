import { db, setStatus, logEvent, sentToday, isSuppressed, suppress, saveEmail } from '../db.js';
import { config } from '../config.js';
import { composeEmail } from '../llm.js';
import { sendMail } from '../mailer.js';
import { publish } from '../bus.js';
import { log } from '../log.js';

export function parisNow() {
  const s = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour12: false });
  const [date, time] = s.split(', ');
  const [d, m, y] = date.split('/').map(Number);
  const [H] = time.split(':').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { hour: H, weekday: day };
}

export function inSendWindow() {
  const { hour, weekday } = parisNow();
  if (weekday === 0 || weekday === 6) return false;
  return hour >= config.sendWindow.start && hour < config.sendWindow.end;
}

// Pause pilotable depuis le dashboard
let paused = false;
export const setPaused = (v) => { paused = !!v; };
export const isPaused = () => paused;

const jitter = (min, max) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

/** Envoie les premiers contacts aux leads QUALIFIED, dans la limite du quota jour. */
export async function sendNewBatch() {
  if (paused || !inSendWindow()) return 0;
  const remaining = config.quotas.newPerDay - sentToday(['SENT']);
  if (remaining <= 0) return 0;

  const leads = db
    .prepare(`SELECT * FROM leads WHERE status = 'QUALIFIED' AND email IS NOT NULL ORDER BY score DESC, id LIMIT ?`)
    .all(Math.min(remaining, 5));
  if (!leads.length) return 0;

  let sent = 0;
  for (const lead of leads) {
    if (paused) break;
    if (isSuppressed(lead.email)) { setStatus(lead.id, 'OPTOUT'); continue; }
    try {
      const mail = await composeEmail(lead, { touchNumber: 0 });
      await sendMail({ to: lead.email, toName: lead.name, subject: mail.subject, body: mail.body });
      db.prepare(
        `UPDATE leads SET status = 'CONTACTED', email_subject = ?, email_body = ?,
         contacted_at = datetime('now'), last_touch_at = datetime('now'), touches = 1,
         updated_at = datetime('now') WHERE id = ?`
      ).run(mail.subject, mail.body, lead.id);
      logEvent(lead.id, 'SENT', `« ${mail.subject} » → ${lead.email}`);
      saveEmail({ leadId: lead.id, kind: 'cold', to: lead.email, name: lead.name, sector: lead.sector_label, city: lead.city, score: lead.score, subject: mail.subject, body: mail.body });
      publish('email', {
        leadId: lead.id, kind: 'cold', to: lead.email, name: lead.name,
        sector: lead.sector_label, city: lead.city, score: lead.score,
        subject: mail.subject, body: mail.body,
      });
      log(`📧 Envoyé à ${lead.name} <${lead.email}> — « ${mail.subject} »`);
      sent++;
      await jitter(45_000, 120_000);
    } catch (err) {
      logEvent(lead.id, 'ERROR', `send: ${err.message}`);
      if (/550|551|553|invalid|no such user|does not exist/i.test(err.message)) {
        suppress(lead.email, 'adresse invalide'); setStatus(lead.id, 'BOUNCED');
      }
    }
  }
  return sent;
}
