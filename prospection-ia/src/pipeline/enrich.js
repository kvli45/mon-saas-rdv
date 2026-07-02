import { db, setStatus, logEvent, isSuppressed } from '../db.js';
import { config } from '../config.js';
import { scrapeSite, hunterLookup, searchWebsite } from '../scraper.js';
import { log } from '../log.js';

/** Enrichit un lot de leads NEW : scrape le site (JS + anti-bot), extrait email + texte. */
export async function enrichBatch(limit = 8) {
  const leads = db.prepare(`SELECT * FROM leads WHERE status = 'NEW' ORDER BY id LIMIT ?`).all(limit);
  if (!leads.length) return 0;

  let enriched = 0;
  for (const lead of leads) {
    try {
      let email = null, excerpt = null, phone = null;

      // Pas de site web ? On le cherche (nom + ville) pour rendre le lead exploitable.
      let website = lead.website;
      if (!website && config.scraper.resolveWebsites) {
        website = await searchWebsite(lead.name, lead.city);
        if (website) {
          db.prepare(`UPDATE leads SET website = ? WHERE id = ?`).run(website, lead.id);
          logEvent(lead.id, 'ENRICHED', `site web trouvé : ${website}`);
        }
      }

      if (website) {
        const r = await scrapeSite(website, lead.name);
        email = r.email;
        excerpt = r.excerpt;
        phone = r.phone;
        if (!email) {
          try {
            const domain = new URL(website).hostname.replace(/^www\./, '');
            email = await hunterLookup(domain);
          } catch { /* url invalide */ }
        }
      }

      if (email && isSuppressed(email)) {
        setStatus(lead.id, 'OPTOUT');
        logEvent(lead.id, 'ENRICHED', 'email en liste de suppression');
        continue;
      }

      db.prepare(`UPDATE leads SET email = ?, site_excerpt = ?, phone = COALESCE(?, phone), status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(email, excerpt, phone, email ? 'ENRICHED' : 'NO_EMAIL', lead.id);
      logEvent(lead.id, 'ENRICHED', email ? `email trouvé : ${email}` : (phone ? `pas d'email, ☎ ${phone} (relance tel)` : 'aucun contact'));
      if (email) enriched++;
    } catch (err) {
      logEvent(lead.id, 'ERROR', `enrich: ${err.message}`);
      setStatus(lead.id, 'NO_EMAIL');
    }
  }
  log(`Enrichissement : ${leads.length} sites scrapés, ${enriched} emails qualifiés trouvés`);
  return enriched;
}
