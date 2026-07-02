import { db, setStatus, logEvent, isSuppressed } from '../db.js';
import { scrapeSite, hunterLookup } from '../scraper.js';
import { log } from '../log.js';

/** Enrichit un lot de leads NEW : scrape le site (JS + anti-bot), extrait email + texte. */
export async function enrichBatch(limit = 8) {
  const leads = db.prepare(`SELECT * FROM leads WHERE status = 'NEW' ORDER BY id LIMIT ?`).all(limit);
  if (!leads.length) return 0;

  let enriched = 0;
  for (const lead of leads) {
    try {
      let email = null;
      let excerpt = null;

      if (lead.website) {
        const r = await scrapeSite(lead.website, lead.name);
        email = r.email;
        excerpt = r.excerpt;
        if (!email) {
          try {
            const domain = new URL(lead.website).hostname.replace(/^www\./, '');
            email = await hunterLookup(domain);
          } catch { /* url invalide */ }
        }
      }

      if (email && isSuppressed(email)) {
        setStatus(lead.id, 'OPTOUT');
        logEvent(lead.id, 'ENRICHED', 'email en liste de suppression');
        continue;
      }

      db.prepare(`UPDATE leads SET email = ?, site_excerpt = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(email, excerpt, email ? 'ENRICHED' : 'NO_EMAIL', lead.id);
      logEvent(lead.id, 'ENRICHED', email ? `email trouvé : ${email}` : 'aucun email (à relancer par téléphone)');
      if (email) enriched++;
    } catch (err) {
      logEvent(lead.id, 'ERROR', `enrich: ${err.message}`);
      setStatus(lead.id, 'NO_EMAIL');
    }
  }
  log(`Enrichissement : ${leads.length} sites scrapés, ${enriched} emails qualifiés trouvés`);
  return enriched;
}
