import { db, kvGet, kvSet, logEvent } from '../db.js';
import { config, SECTORS, CITIES } from '../config.js';
import { cityCoords } from '../geo.js';
import { initBrowser, searchWebsite } from '../scraper.js';
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
  const status = row.email ? 'ENRICHED' : 'NEW';
  const r = insertLead.run({
    place_id: row.place_id, name: (row.name || 'Inconnu').slice(0, 140), sector: row.sector, sector_label: row.sector_label,
    city: row.city, address: row.address || null, phone: row.phone || null, website: row.website || null,
    email: row.email || null, rating: row.rating ?? null, reviews: row.reviews ?? null, status,
  });
  if (r.changes > 0) { logEvent(r.lastInsertRowid, 'SOURCED', sourceTag); return true; }
  return false;
}

/* ============ 1) OpenStreetMap / Overpass (autour de coordonnées = fiable) ============ */
const OSM = {
  detailing:      ['nwr["amenity"="car_wash"]', 'nwr["shop"="car_repair"]'],
  lavage:         ['nwr["amenity"="car_wash"]'],
  nettoyage_auto: ['nwr["amenity"="car_wash"]', 'nwr["shop"="car_repair"]'],
  garage:         ['nwr["shop"="car_repair"]'],
  carrosserie:    ['nwr["shop"="car_repair"]', 'nwr["shop"="car_body_repair"]'],
  concession:     ['nwr["shop"="car"]'],
  location:       ['nwr["amenity"="car_rental"]'],
  vtc:            [],
};
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];

async function overpassQuery(body) {
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(body), signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
    } catch { /* miroir suivant */ }
  }
  return null;
}

async function sourceOverpass(sector, city) {
  const filters = OSM[sector.key];
  if (!filters?.length) return 0;
  const coords = cityCoords(city);
  // 1er choix : autour des coordonnées (fiable). Fallback : zone par nom.
  const region = coords
    ? filters.map((f) => `${f}(around:11000,${coords[0]},${coords[1]});`).join('')
    : `area["name"="${city}"]["boundary"="administrative"]->.a;` + filters.map((f) => `${f}(area.a);`).join('');
  const body = `[out:json][timeout:25];(${region});out center tags 120;`;
  const data = await overpassQuery(body);
  if (!data?.elements) return 0;

  let added = 0;
  for (const el of data.elements) {
    const t = el.tags || {};
    if (!t.name) continue;
    let website = t.website || t['contact:website'] || t.url || null;
    if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
    const phone = t.phone || t['contact:phone'] || t['contact:mobile'] || null;
    const email = t.email || t['contact:email'] || null;
    const address = [t['addr:housenumber'], t['addr:street'], t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ') || null;
    if (!website && !email && !phone && !address) continue;
    if (addLead({ place_id: `osm:${el.type}/${el.id}`, name: t.name, sector: sector.key, sector_label: sector.label, city, address, phone, website, email }, `OSM · ${sector.key} @ ${city}`)) added++;
  }
  return added;
}

/* ============ 2) Annuaire officiel des entreprises (recherche-entreprises.api.gouv.fr) ============ */
// Gratuit, sans clé. Donne nom + adresse (pas d'email) → la résolution de site prend le relais.
const NAF = {
  garage: '45.20A,45.20B', carrosserie: '45.20A,45.20B', detailing: '45.20A,45.20B',
  lavage: '45.20A', nettoyage_auto: '45.20A', concession: '45.11Z', location: '77.11A,77.11B', vtc: '49.32Z',
};
async function sourceRegistry(sector, city) {
  if (!config.sources.registry) return 0;
  const naf = NAF[sector.key];
  let added = 0;
  for (let page = 1; page <= 2; page++) {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(city)}${naf ? `&activite_principale=${encodeURIComponent(naf)}` : ''}&page=${page}&per_page=25&etat_administratif=A`;
    let data = null;
    try { const res = await fetch(url, { signal: AbortSignal.timeout(15000) }); if (res.ok) data = await res.json(); } catch { break; }
    const results = data?.results || [];
    if (!results.length) break;
    for (const r of results) {
      const s = r.siege || {};
      if (s.libelle_commune && city && !new RegExp(city.slice(0, 5), 'i').test(s.libelle_commune)) continue; // garde la bonne ville
      const address = [s.adresse || [s.numero_voie, s.type_voie, s.libelle_voie].filter(Boolean).join(' '), s.code_postal, s.libelle_commune].filter(Boolean).join(', ') || null;
      if (addLead({ place_id: `sirene:${r.siren || r.siret || r.nom_complet}`, name: r.nom_complet || r.nom_raison_sociale, sector: sector.key, sector_label: sector.label, city, address }, `Sirene · ${sector.key} @ ${city}`)) added++;
    }
  }
  return added;
}

/* ============ 3) Google Places (premium, si clé) ============ */
async function sourcePlaces(sector, city) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.placesKey, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus' },
    body: JSON.stringify({ textQuery: `${sector.query} ${city}`, languageCode: 'fr', maxResultCount: 20 }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}`);
  let added = 0;
  for (const p of (await res.json()).places || []) {
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
    if (addLead({ place_id: p.id, name: p.displayName?.text, sector: sector.key, sector_label: sector.label, city, address: p.formattedAddress, phone: p.nationalPhoneNumber, website: p.websiteUri, rating: p.rating, reviews: p.userRatingCount }, `Places · ${sector.key} @ ${city}`)) added++;
  }
  return added;
}

/* ============ 4) Recherche web (fallback, paginé) ============ */
async function sourceSearch(sector, city) {
  await initBrowser();
  const opts = { headless: config.scraper.headless, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] };
  if (config.scraper.chromePath) opts.executablePath = config.scraper.chromePath;
  const b = await chromium.launch(opts);
  const page = await b.newPage({ locale: 'fr-FR' });
  const seen = new Set();
  let added = 0;
  const BLOCK = /google\.|facebook\.|instagram|linkedin|pagesjaunes|yelp|tripadvisor|leboncoin|mappy|societe\.com|wikipedia|youtube|duckduckgo|openstreetmap|infogreffe|verif\.com/i;
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
      await page.waitForTimeout(700);
    }
  } finally { await page.close().catch(() => {}); await b.close().catch(() => {}); }
  return added;
}

/* ============ Orchestration ============ */
export async function sourceNextTarget() {
  const { sector, city, idx, total } = nextTarget();
  log(`Sourcing : ${sector.label} à ${city} (${idx + 1}/${total})`);
  let added = 0;
  const parts = [];
  const run = async (label, fn) => { try { const n = await fn(); added += n; parts.push(`${label}:${n}`); } catch (e) { parts.push(`${label}:err`); log(`  ${label} : ${e.message}`); } };

  if (config.placesKey) await run('Places', () => sourcePlaces(sector, city));
  await run('OSM', () => sourceOverpass(sector, city));
  await run('Sirene', () => sourceRegistry(sector, city));
  if (added === 0) await run('Web', () => sourceSearch(sector, city));

  log(`Sourcing terminé : ${added} nouveaux leads (${parts.join(' · ')})`);
  return added;
}
