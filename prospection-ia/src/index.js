import { assertConfig, config } from './config.js';
import { db, counts } from './db.js';
import { sourceNextTarget } from './pipeline/source.js';
import { enrichBatch } from './pipeline/enrich.js';
import { qualifyBatch } from './pipeline/qualify.js';
import { sendNewBatch, brevoSend } from './pipeline/send.js';
import { followupBatch } from './pipeline/followup.js';
import { maybeDailyReport, buildReport } from './report.js';
import { log, logError } from './log.js';

/**
 * CleanTech Prospector — boucle autonome 24h/24.
 *
 * Chaque cycle (CYCLE_MINUTES) :
 *   1. SOURCING     — si le stock de leads à traiter est bas, va chercher un nouveau
 *                     couple secteur×ville sur Google Places (rotation persistante)
 *   2. ENRICH       — visite les sites, extrait email + texte de personnalisation
 *   3. QUALIFY      — Claude score chaque lead et filtre la qualité
 *   4. SEND         — cold email personnalisé par secteur (quota/jour, jours ouvrés, 9h-18h)
 *   5. FOLLOW-UP    — relances J+3 / J+7, arrêt sur réponse ou opt-out
 *   6. REPORT       — rapport quotidien à 18h
 */
async function cycle() {
  const c = counts();
  const backlog = (c.NEW || 0) + (c.ENRICHED || 0) + (c.QUALIFIED || 0);

  // 1. Sourcing — on garde ~40 leads d'avance, pas plus (économise les quotas API)
  if (backlog < 40) {
    try { await sourceNextTarget(); } catch (err) { logError('sourcing:', err.message); }
  }

  // 2. Enrichissement
  try { await enrichBatch(8); } catch (err) { logError('enrich:', err.message); }

  // 3. Qualification IA
  try { await qualifyBatch(6); } catch (err) { logError('qualify:', err.message); }

  // 4. Premiers contacts
  try { await sendNewBatch(); } catch (err) { logError('send:', err.message); }

  // 5. Relances
  try { await followupBatch(); } catch (err) { logError('followup:', err.message); }

  // 6. Rapport quotidien
  try { await maybeDailyReport(brevoSend); } catch (err) { logError('report:', err.message); }
}

async function main() {
  assertConfig();
  log(`🚀 CleanTech Prospector démarré — cycle toutes les ${config.cycleMinutes} min`);
  log(`Quotas : ${config.quotas.newPerDay} nouveaux emails/jour, ${config.quotas.followupsPerDay} relances/jour`);
  log(`Fenêtre d'envoi : ${config.sendWindow.start}h-${config.sendWindow.end}h (Paris), lun-ven`);
  log('\n' + buildReport() + '\n');

  const once = process.argv.includes('--once');
  for (;;) {
    const started = Date.now();
    try {
      await cycle();
    } catch (err) {
      logError('cycle:', err.stack || err.message);
    }
    if (once) break;
    const elapsed = Date.now() - started;
    const wait = Math.max(30_000, config.cycleMinutes * 60_000 - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
  db.close();
}

main().catch((err) => {
  logError(err.stack || err.message);
  process.exit(1);
});
