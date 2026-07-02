import { db, counts, kvGet, kvSet } from './db.js';
import { config } from './config.js';
import { log } from './log.js';

export function buildReport() {
  const c = counts();
  const today = db
    .prepare(
      `SELECT type, COUNT(*) AS n FROM events WHERE date(created_at) = date('now') GROUP BY type`
    )
    .all();
  const t = Object.fromEntries(today.map((r) => [r.type, r.n]));
  const lines = [
    `📊 RAPPORT PROSPECTION ${config.company.name} — ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    ``,
    `Aujourd'hui :`,
    `  • Nouveaux leads sourcés : ${t.SOURCED || 0}`,
    `  • Emails trouvés : ${t.ENRICHED || 0}`,
    `  • Qualifiés par l'IA : ${t.QUALIFIED || 0} (rejetés : ${t.REJECTED || 0})`,
    `  • Cold emails envoyés : ${t.SENT || 0}`,
    `  • Relances envoyées : ${t.FOLLOWUP || 0}`,
    `  • Réponses marquées : ${t.REPLIED || 0}`,
    ``,
    `Pipeline total :`,
    `  • À enrichir : ${c.NEW || 0} | Sans email : ${c.NO_EMAIL || 0}`,
    `  • À qualifier : ${c.ENRICHED || 0} | Rejetés : ${c.REJECTED || 0}`,
    `  • Prêts à contacter : ${c.QUALIFIED || 0}`,
    `  • Contactés : ${c.CONTACTED || 0} | Relance 1 : ${c.FOLLOWUP_1 || 0} | Séquence finie : ${c.EXHAUSTED || 0}`,
    `  • 🎉 Réponses : ${c.REPLIED || 0} | Opt-out : ${c.OPTOUT || 0} | Bounces : ${c.BOUNCED || 0}`,
  ];
  return lines.join('\n');
}

/** Envoie le rapport quotidien une fois par jour (si DAILY_REPORT_EMAIL configuré). */
export async function maybeDailyReport(sendMail) {
  const todayKey = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  if (kvGet('last_report') === todayKey) return;
  const hour = parseInt(new Date().toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }), 10);
  if (hour < 18) return;
  kvSet('last_report', todayKey);
  const report = buildReport();
  log('\n' + report + '\n');
  if (config.dailyReportEmail && sendMail) {
    try {
      await sendMail({
        to: config.dailyReportEmail,
        toName: 'Rapport',
        subject: `Prospection ${config.company.name} — rapport du jour`,
        body: report,
      });
    } catch (err) {
      log(`Rapport email non envoyé : ${err.message}`);
    }
  }
}

// Exécution directe : npm run report
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(buildReport());
}
