import { assertConfig, config } from './config.js';
import { db } from './db.js';
import { sourceNextTarget } from './pipeline/source.js';
import { enrichBatch } from './pipeline/enrich.js';
import { qualifyBatch } from './pipeline/qualify.js';
import { composeNewDrafts, composeFollowupDrafts } from './pipeline/compose.js';
import { maybeDailyReport, buildReport } from './report.js';
import { sendMail } from './mailer.js';
import { closeBrowser } from './scraper.js';
import { startServer } from './server.js';
import { state } from './control.js';
import { log, logError } from './log.js';

/**
 * CleanTech Prospector — piloté par l'utilisateur depuis le dashboard.
 *
 *  ┌ Session de SCRAPING (démarrée/arrêtée par toi) ┐
 *  │  SOURCING → ENRICH (scraper) → QUALIFY (IA)     │
 *  │  → RÉDACTION des emails en BROUILLON (prêts)    │
 *  └────────────────────────────────────────────────┘
 *  ► ENVOI : 100 % manuel — tu envoies quand tu veux (1 par 1 ou tout), depuis le dashboard.
 *  ► RELANCES : préparées en brouillon quand elles sont dues ; tu les envoies aussi manuellement.
 */

let scraping = false; // évite le chevauchement de passes

async function scrapePass() {
  if (scraping) return;
  scraping = true;
  try {
    // sourcing seulement si le stock à traiter est bas (économise les quotas)
    const c = db.prepare(`SELECT COUNT(*) n FROM leads WHERE status IN ('NEW','ENRICHED','QUALIFIED')`).get().n;
    if (c < 45) { try { await sourceNextTarget(); } catch (e) { logError('sourcing:', e.message); } }
    try { await enrichBatch(8); } catch (e) { logError('enrich:', e.message); }
    try { await qualifyBatch(6); } catch (e) { logError('qualify:', e.message); }
    try { await composeNewDrafts(5); } catch (e) { logError('compose:', e.message); }
  } finally {
    scraping = false;
  }
}

// Boucle de scraping : tourne tant que l'utilisateur l'a démarrée
async function scrapeLoop() {
  for (;;) {
    if (state.scrapeOn) {
      await scrapePass();
      await new Promise((r) => setTimeout(r, 8000)); // rythme entre passes
    } else {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

// Maintenance (sans envoi) : prépare les relances dues + rapport quotidien
async function maintenance() {
  try { await composeFollowupDrafts(5); } catch (e) { logError('compose relance:', e.message); }
  try { await maybeDailyReport(sendMail); } catch (e) { logError('report:', e.message); }
}

async function main() {
  assertConfig();

  startServer({
    onScrapeStart: () => { if (!scraping) scrapePass(); }, // 1ère passe immédiate au démarrage
  });

  log(`🚀 CleanTech Prospector prêt — pilote tout depuis le dashboard`);
  log(`Envoi : ${config.mail.provider}${config.mail.dryRun ? ' (DRY_RUN — simulation)' : ''} · ENVOI 100% MANUEL`);
  log(`▶️  Clique « Démarrer le scraping » sur le dashboard pour commencer.`);
  log('\n' + buildReport() + '\n');

  scrapeLoop();
  setInterval(maintenance, 5 * 60_000);
}

process.on('SIGINT', async () => { log('Arrêt…'); await closeBrowser(); db.close(); process.exit(0); });
main().catch((err) => { logError(err.stack || err.message); process.exit(1); });
