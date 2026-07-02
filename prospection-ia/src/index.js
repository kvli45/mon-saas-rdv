import { assertConfig, config } from './config.js';
import { db, counts } from './db.js';
import { sourceNextTarget } from './pipeline/source.js';
import { enrichBatch } from './pipeline/enrich.js';
import { qualifyBatch } from './pipeline/qualify.js';
import { sendNewBatch } from './pipeline/send.js';
import { followupBatch } from './pipeline/followup.js';
import { maybeDailyReport, buildReport } from './report.js';
import { sendMail } from './mailer.js';
import { closeBrowser } from './scraper.js';
import { startServer } from './server.js';
import { log, logError } from './log.js';

/**
 * CleanTech Prospector — boucle autonome + dashboard temps réel.
 *
 * Cycle : SOURCING (scraper/Places) → ENRICH (scraper anti-bot) → QUALIFY (Claude)
 *         → SEND (Gmail SMTP) → FOLLOW-UP (J+3/J+7) → REPORT
 */
let scrapeRequested = false;

async function cycle() {
  const c = counts();
  const backlog = (c.NEW || 0) + (c.ENRICHED || 0) + (c.QUALIFIED || 0);

  if (scrapeRequested || backlog < 40) {
    scrapeRequested = false;
    try { await sourceNextTarget(); } catch (err) { logError('sourcing:', err.message); }
  }
  try { await enrichBatch(8); } catch (err) { logError('enrich:', err.message); }
  try { await qualifyBatch(6); } catch (err) { logError('qualify:', err.message); }
  try { await sendNewBatch(); } catch (err) { logError('send:', err.message); }
  try { await followupBatch(); } catch (err) { logError('followup:', err.message); }
  try { await maybeDailyReport(sendMail); } catch (err) { logError('report:', err.message); }
}

async function main() {
  assertConfig();

  // Dashboard — le bouton "Scraper maintenant" arme un cycle immédiat
  startServer(() => {
    scrapeRequested = true;
    runCycleNow();
  });

  log(`🚀 CleanTech Prospector démarré — cycle toutes les ${config.cycleMinutes} min`);
  log(`Envoi : ${config.mail.provider}${config.mail.dryRun ? ' (DRY_RUN — simulation)' : ''} · quotas ${config.quotas.newPerDay} nouveaux + ${config.quotas.followupsPerDay} relances/jour`);
  log(`Fenêtre d'envoi : ${config.sendWindow.start}h-${config.sendWindow.end}h (Paris), lun-ven`);
  log('\n' + buildReport() + '\n');

  const once = process.argv.includes('--once');
  let running = false;
  async function runCycleNow() {
    if (running) return;
    running = true;
    try { await cycle(); } catch (err) { logError('cycle:', err.stack || err.message); }
    running = false;
  }
  // expose pour le trigger dashboard
  globalThis.__runCycle = runCycleNow;

  await runCycleNow();
  if (once) { await closeBrowser(); db.close(); process.exit(0); }

  setInterval(runCycleNow, config.cycleMinutes * 60_000);
}

// re-déclenchement immédiat depuis le dashboard
function runCycleNow() { globalThis.__runCycle?.(); }

process.on('SIGINT', async () => { log('Arrêt…'); await closeBrowser(); db.close(); process.exit(0); });

main().catch((err) => { logError(err.stack || err.message); process.exit(1); });
