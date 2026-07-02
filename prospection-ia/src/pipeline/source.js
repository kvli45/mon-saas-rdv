import { db, kvGet, kvSet, logEvent } from '../db.js';
import { config, SECTORS, CITIES } from '../config.js';
import { initBrowser } from '../scraper.js';
import { chromium } from 'playwright';
import { log } from '../log.js';

// Rotation persistante secteur × ville
function nextTarget() {
  const idx = parseInt(kvGet('target_index', '0'), 10);
  const total = SECTORS.length * CITIES.length;
  const sector = SECTORS[idx % SECTORS.length];
  const city = CITIES[Math.floor(idx / SECTORS.length) % CITIES.length];
  kvSet('target_index', (idx + 1) % total);
  return { sector, city, idx, total };
}

const insertLead = db.prepare(`
  INSERT OR IGNORE INTO leads (place_id, name, sector, sector_label, city, address, phone, website, email, rating, reviews, status)
  VALUES (@place_id, @name, @sector, @sector_label, @city, @address, @phone, @website, @email, @rating, @reviews, @status)
`);

function addLead(row, sourceTag) {
  // statut initial : NEW si site (à scraper), ENRICHED si email déjà connu, sinon NEW
  const status = row.email ? 'ENRICHED' : 'NEW';
  const r = insertLead.run({
    place_id: row.place_id, name: row.name || 'Inconnu', sector: row.sector, sector_label: row.sector_label,
    city: row.city, address: row.address || null, phone: row.phone || null, website: row.website || null,
    email: row.email || null, rating: row.rating ?? null, reviews: row.reviews ?? null, status,
  });
  if (r.changes > 0) { logEvent(r.lastInsertRowid, 'SOURCED', sourceTag); return true; }
  return false;
}

/* ============ 1) OpenStreetMap / Overpass (puissant, gratuit, sans clé) ============ */
// Filtres OSM par secteur
const OSM = {
  detailing:      ['nwr["amenity"="car_wash"]', 'nwr["shop"="car_repair"]'],
  lavage:         ['nwr["amenity"="car_wash"]'],
  nettoyage_auto: ['nwr["amenity"="car_wash"]'],
  garage:         ['nwr["shop"="car_repair"]'],
  carrosserie:    ['nwr["shop"="car_repair"]', 'nwr["shop"="car_body_repair"]'],
  concession:     ['nwr["shop"="car"]'],
  location:       ['nwr["amenity"="car_rental"]'],
  vtc:            [], // peu présent dans OSM → passe au fallback
};
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function sourceOverpass(sector, city) {
  const filters = OSM[sector.key];
  if (!filters || !filters.length) return 0;
  const body = `[out:json][timeout:25];
area["name"="${city}"]["boundary"="administrative"]->.a;
(${filters.map((f) => `${f}(area.a);`).join('')});
out center tags 80;`;

  let data = null;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(body), signal: AbortSignal.timeout(30000) });
      if (res.ok) { data = await res.json(); break; }
    } catch { /* essaie le miroir suivant */ }
  }
  if (!data?.elements) return 0;

  let added = 0;
  for (const el of data.elements) {
    const t = el.tags || {};
    if (!t.name) continue;
    const website = t.website || t['contact:website'] || t.url || null;
    const phone = t.phone || t['contact:phone'] || t['contact:mobile'] || null;
    const email = t.email || t['contact:email'] || null;
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ') || null;
    if (!website && !email && !phone) continue; // sans aucun canal = inexploitable
    if (addLead({
      place_id: `osm:${el.type}/${el.id}`, name: t.name, sector: sector.key, sector_label: sector.label,
      city, address, phone, website: website ? (website.startsWith('http') ? website : 'https://' + website) : null, email,
    }, `OSM · ${sector.key} @ ${city}`)) added++;
  }
  return added;
}

/* ============ 2) Google Places (premium, si clé) ============ */
async function sourcePlaces(sector, city) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'X-Goog-Api-Key': config.placesKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: `${sector.query} ${city}`, languageCode: 'fr', maxResultCount: 20 }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}`);
  const places = (await res.json()).places || [];
  let added = 0;
  for (const p of places) {
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
    if (addLead({
      place_id: p.id, name: p.displayName?.text, sector: sector.key, sector_label: sector.label, city,
      address: p.formattedAddress, phone: p.nationalPhoneNumber, website: p.websiteUri,
      rating: p.rating, reviews: p.userRatingCount,
    }, `Places · ${sector.key} @ ${city}`)) added++;
  }
  return added;
}

/* ============ 3) Recherche web (fallback, Playwright/DuckDuckGo, paginé) ============ */
async function sourceSearch(sector, city) {
  await initBrowser();
  const opts = { headless: config.scraper.headless, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] };
  if (config.scraper.chromePath) opts.executablePath = config.scraper.chromePath;
  const b = await chromium.launch(opts);
  const page = await b.newPage({ locale: 'fr-FR' });
  const seen = new Set();
  let added = 0;
  const BLOCK = /google\.|facebook\.|instagram|linkedin|pagesjaunes|yelp|tripadvisor|leboncoin|mappy|societe\.com|wikipedia|youtube|duckduckgo|openstreetmap/i;
  try {
    for (const q of [`${sector.query} ${city}`, `${sector.query} ${city} contact`]) {
      await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(900);
      const results = await page.$$eval('a.result__a', (els) => els.map((e) => ({ href: e.href, title: e.textContent?.trim() || '' }))).catch(() => []);
      for (const r of results.slice(0, 20)) {
        let host; try { host = new URL(r.href).hostname.replace(/^www\./, ''); } catch { continue; }
        if (BLOCK.test(host) || seen.has(host)) continue;
        seen.add(host);
        if (addLead({ place_id: `web:${host}`, name: r.title.slice(0, 120) || host, sector: sector.key, sector_label: sector.label, city, website: `https://${host}` }, `Web · ${sector.key} @ ${city}`)) added++;
      }
      await page.waitForTimeout(800);
    }
  } finally {
    await page.close().catch(() => {});
    await b.close().catch(() => {});
  }
  return added;
}

/* ============ Orchestration : combine les sources pour un max de résultats ============ */
export async function sourceNextTarget() {
  const { sector, city, idx, total } = nextTarget();
  log(`Sourcing : ${sector.label} à ${city} (${idx + 1}/${total})`);
  let added = 0;
  const parts = [];

  // Source premium si clé, sinon OSM en primaire
  try {
    if (config.placesKey) { const n = await sourcePlaces(sector, city); added += n; parts.push(`Places:${n}`); }
  } catch (e) { log(`  Places indispo : ${e.message}`); }

  try { const n = await sourceOverpass(sector, city); added += n; parts.push(`OSM:${n}`); }
  catch (e) { log(`  OSM indispo : ${e.message}`); }

  // Fallback recherche web si les sources structurées n'ont rien donné (ou secteur non couvert)
  if (added === 0) {
    try { const n = await sourceSearch(sector, city); added += n; parts.push(`Web:${n}`); }
    catch (e) { log(`  Web indispo : ${e.message}`); }
  }

  log(`Sourcing terminé : ${added} nouveaux leads (${parts.join(' · ')})`);
  return added;
}
