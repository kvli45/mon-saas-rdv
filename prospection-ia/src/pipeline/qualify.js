import { db, setStatus, logEvent } from '../db.js';
import { config } from '../config.js';
import { qualifyLead } from '../llm.js';
import { log } from '../log.js';

/** Qualification IA : Claude score chaque lead enrichi et décide accept/reject. */
export async function qualifyBatch(limit = 6) {
  const leads = db.prepare(`SELECT * FROM leads WHERE status = 'ENRICHED' ORDER BY id LIMIT ?`).all(limit);
  if (!leads.length) return 0;

  let accepted = 0;
  for (const lead of leads) {
    try {
      const result = await qualifyLead(lead);
      const ok = result.decision === 'accept' && result.score >= config.minScore;
      db.prepare(
        `UPDATE leads SET score = ?, qualify_reason = ?, hooks = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(result.score, result.reason, JSON.stringify(result.hooks || []), ok ? 'QUALIFIED' : 'REJECTED', lead.id);
      logEvent(lead.id, ok ? 'QUALIFIED' : 'REJECTED', `score=${result.score} — ${result.reason}`);
      if (ok) accepted++;
    } catch (err) {
      logEvent(lead.id, 'ERROR', `qualify: ${err.message}`);
      // on laisse en ENRICHED pour retenter au prochain cycle (erreur API transitoire)
    }
  }
  log(`Qualification : ${leads.length} évalués, ${accepted} acceptés (seuil ${config.minScore})`);
  return accepted;
}
