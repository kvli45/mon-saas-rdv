import { db, kvGet, kvSet, logEvent } from '../db.js';
import { config, SECTORS, CITIES } from '../config.js';
import { log } from '../log.js';

/**
 * Sourcing : interroge Google Places (New) pour un couple secteur×ville,
 * en rotation persistante — le pipeline balaie ainsi toutes les cibles en continu.
 */
export async function sourceNextTarget() {
  const idx = parseInt(kvGet('target_index', '0'), 10);
  const total = SECTORS.length * CITIES.length;
  const sector = SECTORS[idx % SECTORS.length];
  const city = CITIES[Math.floor(idx / SECTORS.length) % CITIES.length];
  kvSet('target_index', (idx + 1) % total);

  log(`Sourcing : "${sector.query}" à ${city} (${idx + 1}/${total})`);

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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const places = data.places || [];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO leads (place_id, name, sector, sector_label, city, address, phone, website, rating, reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  for (const p of places) {
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
    const r = insert.run(
      p.id,
      p.displayName?.text || 'Inconnu',
      sector.key,
      sector.label,
      city,
      p.formattedAddress || null,
      p.nationalPhoneNumber || null,
      p.websiteUri || null,
      p.rating ?? null,
      p.userRatingCount ?? null
    );
    if (r.changes > 0) {
      added++;
      logEvent(r.lastInsertRowid, 'SOURCED', `${sector.key} @ ${city}`);
    }
  }
  log(`Sourcing terminé : ${places.length} résultats, ${added} nouveaux leads`);
  return added;
}
