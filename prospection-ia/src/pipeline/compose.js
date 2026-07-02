import { db, logEvent } from '../db.js';
import { config } from '../config.js';
import { composeEmail } from '../llm.js';
import { publish } from '../bus.js';
import { log } from '../log.js';

function publishDraft(lead, touch) {
  publish('draft', {
    leadId: lead.id, name: lead.name, sector: lead.sector_label, city: lead.city,
    score: lead.score, touch,
  });
}

/** Prépare les emails de PREMIER contact : QUALIFIED -> brouillon prêt (status READY). */
export async function composeNewDrafts(limit = 5) {
  const leads = db
    .prepare(`SELECT * FROM leads WHERE status='QUALIFIED' AND email IS NOT NULL AND draft_body IS NULL ORDER BY score DESC, id LIMIT ?`)
    .all(limit);
  if (!leads.length) return 0;
  let n = 0;
  for (const lead of leads) {
    try {
      const mail = await composeEmail(lead, { touchNumber: 0 });
      db.prepare(
        `UPDATE leads SET draft_subject=?, draft_body=?, draft_touch=0, status='READY', updated_at=datetime('now') WHERE id=?`
      ).run(mail.subject, mail.body, lead.id);
      logEvent(lead.id, 'DRAFT', `email préparé : « ${mail.subject} »`);
      publishDraft({ ...lead }, 0);
      n++;
    } catch (err) {
      logEvent(lead.id, 'ERROR', `compose: ${err.message}`);
    }
  }
  if (n) log(`Rédaction : ${n} email(s) prêt(s) à envoyer`);
  return n;
}

/** Prépare les RELANCES dues (J+3 / J+7) en brouillon, sans les envoyer. */
export async function composeFollowupDrafts(limit = 5) {
  const [d1, d2] = config.followupDays;
  const due = db
    .prepare(
      `SELECT * FROM leads
       WHERE draft_body IS NULL AND email IS NOT NULL AND (
         (status='CONTACTED'  AND julianday('now')-julianday(last_touch_at) >= ?) OR
         (status='FOLLOWUP_1' AND julianday('now')-julianday(last_touch_at) >= ?)
       ) ORDER BY last_touch_at LIMIT ?`
    )
    .all(d1, d2, limit);
  if (!due.length) return 0;
  let n = 0;
  for (const lead of due) {
    const touch = lead.status === 'CONTACTED' ? 1 : 2;
    try {
      const mail = await composeEmail(lead, { touchNumber: touch });
      db.prepare(
        `UPDATE leads SET draft_subject=?, draft_body=?, draft_touch=?, updated_at=datetime('now') WHERE id=?`
      ).run(`Re: ${lead.email_subject}`, mail.body, touch, lead.id);
      logEvent(lead.id, 'DRAFT', `relance ${touch} préparée`);
      publishDraft(lead, touch);
      n++;
    } catch (err) {
      logEvent(lead.id, 'ERROR', `compose relance: ${err.message}`);
    }
  }
  if (n) log(`Rédaction : ${n} relance(s) prête(s) à envoyer`);
  return n;
}
