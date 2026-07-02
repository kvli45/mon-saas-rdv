import { db, logEvent, sentToday, isSuppressed, setStatus, saveEmail } from '../db.js';
import { config } from '../config.js';
import { composeEmail } from '../llm.js';
import { sendMail } from '../mailer.js';
import { inSendWindow, isPaused } from './send.js';
import { publish } from '../bus.js';
import { log } from '../log.js';

/**
 * Relances : J+FOLLOWUP_1_DAYS après le 1er contact, puis J+FOLLOWUP_2_DAYS après la relance 1.
 * S'arrête si le lead est passé REPLIED / OPTOUT / BOUNCED (via scripts/mark.js ou webhook).
 */
export async function followupBatch() {
  if (isPaused() || !inSendWindow()) return 0;
  const remaining = config.quotas.followupsPerDay - sentToday(['FOLLOWUP']);
  if (remaining <= 0) return 0;

  const [d1, d2] = config.followupDays;
  const due = db
    .prepare(
      `SELECT * FROM leads
       WHERE (status = 'CONTACTED'  AND julianday('now') - julianday(last_touch_at) >= ?)
          OR (status = 'FOLLOWUP_1' AND julianday('now') - julianday(last_touch_at) >= ?)
       ORDER BY last_touch_at LIMIT ?`
    )
    .all(d1, d2, Math.min(remaining, 5));
  if (!due.length) return 0;

  let sent = 0;
  for (const lead of due) {
    if (isSuppressed(lead.email)) {
      setStatus(lead.id, 'OPTOUT');
      continue;
    }
    const touchNumber = lead.status === 'CONTACTED' ? 1 : 2;
    try {
      const mail = await composeEmail(lead, { touchNumber });
      const subject = `Re: ${lead.email_subject}`;
      await sendMail({ to: lead.email, toName: lead.name, subject, body: mail.body });
      const next = touchNumber === 1 ? 'FOLLOWUP_1' : 'EXHAUSTED';
      db.prepare(
        `UPDATE leads SET status = ?, last_touch_at = datetime('now'), touches = touches + 1, updated_at = datetime('now') WHERE id = ?`
      ).run(next, lead.id);
      logEvent(lead.id, 'FOLLOWUP', `relance ${touchNumber} → ${lead.email}`);
      saveEmail({ leadId: lead.id, kind: `relance ${touchNumber}`, to: lead.email, name: lead.name, sector: lead.sector_label, city: lead.city, score: lead.score, subject, body: mail.body });
      publish('email', {
        leadId: lead.id, kind: `relance ${touchNumber}`, to: lead.email, name: lead.name,
        sector: lead.sector_label, city: lead.city, score: lead.score, subject, body: mail.body,
      });
      log(`🔁 Relance ${touchNumber} envoyée à ${lead.name} <${lead.email}>`);
      sent++;
      await new Promise((r) => setTimeout(r, 45_000 + Math.random() * 60_000));
    } catch (err) {
      logEvent(lead.id, 'ERROR', `followup: ${err.message}`);
    }
  }
  return sent;
}
