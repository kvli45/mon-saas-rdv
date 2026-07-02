import { db, setStatus, logEvent, isSuppressed, suppress, saveEmail } from '../db.js';
import { sendMail } from '../mailer.js';
import { publish } from '../bus.js';
import { log } from '../log.js';

/**
 * Envoi MANUEL d'un email déjà préparé (brouillon), déclenché depuis le dashboard.
 * Envoie le brouillon (draft_*), enregistre, fait avancer le statut selon le palier.
 */
export async function sendReady(leadId) {
  const lead = db.prepare(`SELECT * FROM leads WHERE id=? AND draft_body IS NOT NULL`).get(leadId);
  if (!lead) return { ok: false, error: 'aucun brouillon' };
  if (isSuppressed(lead.email)) { setStatus(lead.id, 'OPTOUT'); return { ok: false, error: 'opt-out' }; }

  const touch = lead.draft_touch ?? 0;
  const subject = lead.draft_subject;
  const body = lead.draft_body;
  try {
    await sendMail({ to: lead.email, toName: lead.name, subject, body });
  } catch (err) {
    logEvent(lead.id, 'ERROR', `send: ${err.message}`);
    if (/550|551|553|invalid|no such user|does not exist/i.test(err.message)) {
      suppress(lead.email, 'adresse invalide'); setStatus(lead.id, 'BOUNCED');
    }
    return { ok: false, error: err.message };
  }

  // fait avancer le lead selon le palier envoyé
  const nextStatus = touch === 0 ? 'CONTACTED' : touch === 1 ? 'FOLLOWUP_1' : 'EXHAUSTED';
  const setContacted = touch === 0 ? `contacted_at=datetime('now'), email_subject=?, email_body=?,` : '';
  const args = touch === 0
    ? [nextStatus, subject, body, lead.id]
    : [nextStatus, lead.id];
  db.prepare(
    `UPDATE leads SET status=?, ${setContacted} last_touch_at=datetime('now'),
     touches=touches+1, draft_subject=NULL, draft_body=NULL, draft_touch=NULL, updated_at=datetime('now')
     WHERE id=?`
  ).run(...args);

  const kind = touch === 0 ? 'cold' : `relance ${touch}`;
  logEvent(lead.id, touch === 0 ? 'SENT' : 'FOLLOWUP', `« ${subject} » → ${lead.email}`);
  saveEmail({ leadId: lead.id, kind, to: lead.email, name: lead.name, sector: lead.sector_label, city: lead.city, score: lead.score, subject, body });
  publish('email', { leadId: lead.id, kind, to: lead.email, name: lead.name, sector: lead.sector_label, city: lead.city, score: lead.score, subject, body });
  log(`📧 Envoyé à ${lead.name} <${lead.email}> — « ${subject} »`);
  return { ok: true };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Envoie tous les brouillons prêts (avec délai humain entre chaque). */
export async function sendAllReady(onProgress) {
  const ids = db.prepare(`SELECT id FROM leads WHERE draft_body IS NOT NULL ORDER BY draft_touch, score DESC`).all().map((r) => r.id);
  let sent = 0;
  for (const id of ids) {
    const r = await sendReady(id);
    if (r.ok) { sent++; onProgress?.(sent, ids.length); if (sent < ids.length) await wait(4000 + Math.random() * 6000); }
  }
  return { sent, total: ids.length };
}
