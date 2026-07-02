import { db, setStatus, logEvent, isSuppressed } from '../db.js';
import { config } from '../config.js';
import { log } from '../log.js';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JUNK = /(\.png|\.jpg|\.gif|\.webp|\.css|\.js)$|sentry|wixpress|example\.|@(2x|3x)\b|no-?reply|noreply/i;
const CONTACT_PATHS = ['', '/contact', '/contactez-nous', '/mentions-legales', '/nous-contacter'];

async function fetchText(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CleanTechBot/1.0)' },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) return null;
    return (await res.text()).slice(0, 400_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractEmails(html) {
  const found = new Set();
  for (const m of html.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase().replace(/^20/, '');
    if (!JUNK.test(email) && email.length < 60) found.add(email);
  }
  return [...found];
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function hunterLookup(domain) {
  if (!config.hunterKey) return null;
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${config.hunterKey}&limit=3`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.data?.emails?.[0]?.value;
    return first || null;
  } catch {
    return null;
  }
}

/** Enrichit un lot de leads NEW : visite le site, extrait email + texte de personnalisation. */
export async function enrichBatch(limit = 8) {
  const leads = db.prepare(`SELECT * FROM leads WHERE status = 'NEW' ORDER BY id LIMIT ?`).all(limit);
  if (!leads.length) return 0;

  let enriched = 0;
  for (const lead of leads) {
    try {
      let email = null;
      let excerpt = null;

      if (lead.website) {
        const base = lead.website.replace(/\/+$/, '');
        for (const p of CONTACT_PATHS) {
          const html = await fetchText(base + p);
          if (!html) continue;
          if (!excerpt) excerpt = stripHtml(html).slice(0, 3000);
          const emails = extractEmails(html);
          if (emails.length) {
            // privilégie contact@/info@ ou email sur le même domaine
            const domain = new URL(base).hostname.replace(/^www\./, '');
            email =
              emails.find((e) => e.endsWith('@' + domain)) ||
              emails.find((e) => /^(contact|info|bonjour|hello|accueil)@/.test(e)) ||
              emails[0];
            break;
          }
        }
        if (!email) {
          const domain = new URL(base).hostname.replace(/^www\./, '');
          email = await hunterLookup(domain);
        }
      }

      if (email && isSuppressed(email)) {
        setStatus(lead.id, 'OPTOUT');
        logEvent(lead.id, 'ENRICHED', 'email en liste de suppression');
        continue;
      }

      db.prepare(`UPDATE leads SET email = ?, site_excerpt = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(email, excerpt, email ? 'ENRICHED' : 'NO_EMAIL', lead.id);
      logEvent(lead.id, 'ENRICHED', email ? `email: ${email}` : 'aucun email trouvé');
      if (email) enriched++;
    } catch (err) {
      logEvent(lead.id, 'ERROR', `enrich: ${err.message}`);
      setStatus(lead.id, 'NO_EMAIL');
    }
  }
  log(`Enrichissement : ${leads.length} traités, ${enriched} emails trouvés`);
  return enriched;
}
