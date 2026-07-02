import { db, setStatus, logEvent, sentToday, isSuppressed, suppress } from '../db.js';
import { config } from '../config.js';
import { composeEmail } from '../llm.js';
import { log } from '../log.js';

export function parisNow() {
  const s = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour12: false });
  // "dd/mm/yyyy, HH:MM:SS"
  const [date, time] = s.split(', ');
  const [d, m, y] = date.split('/').map(Number);
  const [H, M] = time.split(':').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dim
  return { hour: H, minute: M, weekday: day };
}

export function inSendWindow() {
  const { hour, weekday } = parisNow();
  if (weekday === 0 || weekday === 6) return false; // week-end
  return hour >= config.sendWindow.start && hour < config.sendWindow.end;
}

async function brevoSend({ to, toName, subject, body }) {
  const footer = `\n\n--\n${config.optoutText}`;
  const html = (body + footer)
    .split('\n')
    .map((l) => l.trim() === '--' ? '<hr style="border:none;border-top:1px solid #ddd">' : `<p style="margin:0 0 10px">${l || '&nbsp;'}</p>`)
    .join('');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: config.sender.email, name: config.sender.name },
      to: [{ email: to, name: toName }],
      subject,
      textContent: body + footer,
      htmlContent: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">${html}</div>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

const jitter = (min, max) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

/** Envoie les premiers contacts aux leads QUALIFIED, dans la limite du quota jour. */
export async function sendNewBatch() {
  if (!inSendWindow()) return 0;
  const remaining = config.quotas.newPerDay - sentToday(['SENT']);
  if (remaining <= 0) return 0;

  const leads = db
    .prepare(`SELECT * FROM leads WHERE status = 'QUALIFIED' AND email IS NOT NULL ORDER BY score DESC, id LIMIT ?`)
    .all(Math.min(remaining, 5)); // max 5 par cycle → étale les envois sur la journée
  if (!leads.length) return 0;

  let sent = 0;
  for (const lead of leads) {
    if (isSuppressed(lead.email)) {
      setStatus(lead.id, 'OPTOUT');
      continue;
    }
    try {
      const mail = await composeEmail(lead, { touchNumber: 0 });
      await brevoSend({ to: lead.email, toName: lead.name, subject: mail.subject, body: mail.body });
      db.prepare(
        `UPDATE leads SET status = 'CONTACTED', email_subject = ?, email_body = ?,
         contacted_at = datetime('now'), last_touch_at = datetime('now'), touches = 1,
         updated_at = datetime('now') WHERE id = ?`
      ).run(mail.subject, mail.body, lead.id);
      logEvent(lead.id, 'SENT', `« ${mail.subject} » → ${lead.email}`);
      log(`📧 Envoyé à ${lead.name} <${lead.email}> — « ${mail.subject} »`);
      sent++;
      await jitter(45_000, 120_000); // 45s-2min entre chaque envoi : rythme humain
    } catch (err) {
      logEvent(lead.id, 'ERROR', `send: ${err.message}`);
      if (/400|invalid/i.test(err.message)) {
        suppress(lead.email, 'adresse invalide');
        setStatus(lead.id, 'BOUNCED');
      }
    }
  }
  return sent;
}

export { brevoSend };
