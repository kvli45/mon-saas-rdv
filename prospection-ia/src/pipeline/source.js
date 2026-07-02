import { db, kvGet, kvSet, logEvent } from '../db.js';
import { config, SECTORS, CITIES } from '../config.js';
import { initBrowser } from '../scraper.js';
import { chromium } from 'playwright';
import { log } from '../log.js';

// Sélectionne le prochain couple secteur×ville en rotation persistante.
function nextTarget() {
  const idx = parseInt(kvGet('target_index', '0'), 10);
  const total = SECTORS.length * CITIES.length;
  const sector = SECTORS[idx % SECTORS.length];
  const city = CITIES[Math.floor(idx / SECTORS.length) % CITIES.length];
  kvSet('target_index', (idx + 1) % total);
  return { sector, city, idx, total };
}

const insert = () =>
  db.prepare(`
    INSERT OR IGNORE INTO leads (place_id, name, sector, sector_label, city, address, phone, website, rating, reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

/** Sourcing Google Places (New) — structuré, précis. Utilisé si GOOGLE_PLACES_API_KEY fourni. */
async function sourceViaPlaces(sector, city) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.placesKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: `${sector.query} ${city}`, languageCode: 'fr', maxResultCount: 20 }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const places = (await res.json()).places || [];
  const ins = insert();
  let added = 0;
  for (const p of places) {
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
    const r = ins.run(p.id, p.displayName?.text || 'Inconnu', sector.key, sector.label, city,
      p.formattedAddress || null, p.nationalPhoneNumber || null, p.websiteUri || null,
      p.rating ?? null, p.userRatingCount ?? null);
    if (r.changes > 0) { added++; logEvent(r.lastInsertRowid, 'SOURCED', `Places · ${sector.key} @ ${city}`); }
  }
  return added;
}

/** Sourcing par recherche web (Playwright + DuckDuckGo) — aucun compte requis, gratuit. */
async function sourceViaSearch(sector, city) {
  await initBrowser();
  const launchOpts = { headless: config.scraper.headless, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] };
  if (config.scraper.chromePath) launchOpts.executablePath = config.scraper.chromePath;
  const b = await chromium.launch(launchOpts);
  const page = await b.newPage({ locale: 'fr-FR' });
  const seen = new Set();
  const ins = insert();
  let added = 0;
  try {
    const q = encodeURIComponent(`${sector.query} ${city}`);
    await page.goto(`https://html.duckduckgo.com/html/?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1000);
    const results = await page.$$eval('a.result__a', (els) =>
      els.map((e) => ({ href: e.href, title: e.textContent?.trim() || '' }))
    ).catch(() => []);
    const BLOCK = /google\.|facebook\.|instagram|linkedin|pagesjaunes|yelp|tripadvisor|leboncoin|mappy|societe\.com|wikipedia|youtube|duckduckgo/i;
    for (const r of results.slice(0, 15)) {
      let host;
      try { host = new URL(r.href).hostname.replace(/^www\./, ''); } catch { continue; }
      if (BLOCK.test(host) || seen.has(host)) continue;
      seen.add(host);
      const site = `https://${host}`;
      const rr = ins.run(`web:${host}`, r.title.slice(0, 120) || host, sector.key, sector.label, city, null, null, site, null, null);
      if (rr.changes > 0) { added++; logEvent(rr.lastInsertRowid, 'SOURCED', `Web · ${sector.key} @ ${city}`); }
    }
  } finally {
    await page.close().catch(() => {});
    await b.close().catch(() => {});
  }
  return added;
}

export async function sourceNextTarget() {
  const { sector, city, idx, total } = nextTarget();
  const via = config.placesKey ? 'Google Places' : 'recherche web';
  log(`Sourcing (${via}) : "${sector.query}" à ${city} (${idx + 1}/${total})`);
  const added = config.placesKey ? await sourceViaPlaces(sector, city) : await sourceViaSearch(sector, city);
  log(`Sourcing terminé : ${added} nouveaux leads (${sector.label}, ${city})`);
  return added;
}
