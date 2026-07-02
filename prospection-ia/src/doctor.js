import { config } from './config.js';
import { cityCoords } from './geo.js';
import dns from 'node:dns/promises';

// Diagnostic complet : teste chaque brique et dit précisément ce qui bloque.
// Usage : npm run doctor

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m', b: '\x1b[1m' };
const ok = (m) => console.log(`${C.g}✅ ${m}${C.x}`);
const ko = (m, hint) => { console.log(`${C.r}❌ ${m}${C.x}`); if (hint) console.log(`   ${C.d}→ ${hint}${C.x}`); };
const warn = (m, hint) => { console.log(`${C.y}⚠️  ${m}${C.x}`); if (hint) console.log(`   ${C.d}→ ${hint}${C.x}`); };
const title = (m) => console.log(`\n${C.b}${m}${C.x}`);

async function testBrowser() {
  title('2. Navigateur (Playwright) — nécessaire pour scraper & recherche web');
  try {
    const { chromium } = await import('playwright');
    const opts = { headless: true, args: ['--no-sandbox'] };
    if (config.scraper.chromePath) opts.executablePath = config.scraper.chromePath;
    const b = await chromium.launch(opts);
    const p = await b.newPage();
    await b.close();
    ok('Chromium se lance correctement');
    return true;
  } catch (e) {
    ko(`Chromium ne se lance pas : ${e.message}`, "Lance : npx playwright install chromium");
    return false;
  }
}

async function testOverpass() {
  title('3. Sourcing OpenStreetMap / Overpass (source principale, gratuite)');
  const [lat, lon] = cityCoords('Annecy');
  const body = `[out:json][timeout:25];(nwr["shop"="car_repair"](around:11000,${lat},${lon});nwr["amenity"="car_wash"](around:11000,${lat},${lon}););out center tags 60;`;
  const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  for (const url of mirrors) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(body), signal: AbortSignal.timeout(30000) });
      if (!res.ok) { warn(`${new URL(url).host} → HTTP ${res.status}`); continue; }
      const data = await res.json();
      const named = (data.elements || []).filter((e) => e.tags?.name);
      const withWeb = named.filter((e) => e.tags.website || e.tags['contact:website']);
      ok(`${new URL(url).host} : ${named.length} commerces à Annecy (${withWeb.length} avec site web)`);
      return true;
    } catch (e) { warn(`${new URL(url).host} injoignable : ${e.message}`); }
  }
  ko('Aucun miroir Overpass joignable', "Vérifie ta connexion internet / un pare-feu qui bloquerait overpass-api.de");
  return false;
}

async function testRegistry() {
  title('4. Annuaire officiel des entreprises (recherche-entreprises.api.gouv.fr)');
  if (!config.sources.registry) { warn('Désactivé (USE_REGISTRY=0)'); return true; }
  try {
    const res = await fetch('https://recherche-entreprises.api.gouv.fr/search?q=Annecy&activite_principale=45.20A&per_page=5&etat_administratif=A', { signal: AbortSignal.timeout(15000) });
    if (!res.ok) { warn(`HTTP ${res.status}`); return false; }
    const data = await res.json();
    ok(`API entreprises OK : ${data.total_results ?? (data.results || []).length} sociétés trouvées (garages Annecy)`);
    return true;
  } catch (e) { warn(`Injoignable : ${e.message}`); return false; }
}

async function testMX() {
  title('5. Vérification MX (DNS) — filtre les domaines qui reçoivent des emails');
  try {
    const good = await dns.resolveMx('gmail.com');
    let dead = false; try { await dns.resolveMx('domaine-mort-inexistant-xyz123.fr'); } catch { dead = true; }
    if (good.length && dead) ok('Résolution MX opérationnelle (vivant détecté, mort rejeté)');
    else warn('MX partiel — la résolution DNS répond mais résultats inattendus');
    return true;
  } catch (e) { ko(`DNS/MX indisponible : ${e.message}`, 'Réseau ou DNS bloqué'); return false; }
}

async function testAnthropic() {
  title('6. Clé API Anthropic (qualification + rédaction des emails)');
  if (!config.anthropicKey) { ko('ANTHROPIC_API_KEY absente', 'Ajoute-la dans .env'); return false; }
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: config.anthropicKey });
    await client.messages.create({ model: config.qualifyModel, max_tokens: 4, messages: [{ role: 'user', content: 'ok' }] });
    ok(`Clé valide — modèle ${config.qualifyModel} accessible`);
    return true;
  } catch (e) {
    if (/401|invalid x-api-key|authentication/i.test(e.message)) ko('Clé API refusée (401)', 'La clé est invalide/révoquée — génère-en une neuve sur platform.claude.com');
    else warn(`Erreur API : ${e.message}`);
    return false;
  }
}

async function testMailer() {
  title('7. Envoi email');
  if (config.mail.dryRun) { warn('DRY_RUN=1 : mode simulation (aucun email réel envoyé) — normal pour tester'); return true; }
  const { verifyMailer } = await import('./mailer.js');
  const s = await verifyMailer();
  if (s.ok) ok(s.mode); else ko(s.mode, "Gmail : active la validation 2 étapes puis crée un 'mot de passe d'application' (16 lettres)");
  return s.ok;
}

async function main() {
  console.log(`${C.b}🩺 DIAGNOSTIC — CleanTech Prospector${C.x}`);

  title('1. Configuration (.env)');
  console.log(`   Envoi : ${config.mail.provider}${config.mail.dryRun ? ' (DRY_RUN)' : ''}`);
  console.log(`   Clé Anthropic : ${config.anthropicKey ? 'présente' : C.r + 'MANQUANTE' + C.x}`);
  console.log(`   Google Places : ${config.placesKey ? 'clé fournie (premium)' : 'non (OSM utilisé, très bien)'}`);
  console.log(`   Annuaire entreprises : ${config.sources.registry ? 'activé' : 'désactivé'}`);
  console.log(`   Résolution de sites : ${config.scraper.resolveWebsites ? 'activée' : 'désactivée'} · Devine email+MX : ${config.scraper.guessEmail ? 'oui' : 'non'}`);

  const results = {
    browser: await testBrowser(),
    overpass: await testOverpass(),
    registry: await testRegistry(),
    mx: await testMX(),
    anthropic: await testAnthropic(),
    mailer: await testMailer(),
  };

  title('═══ VERDICT ═══');
  const sourcingOk = results.overpass || results.registry;
  if (sourcingOk) ok('SOURCING opérationnel → tu vas récupérer des leads en démarrant le scraping');
  else ko('SOURCING KO → aucune source ne répond (voir ci-dessus). C\'est LA cause du "0 résultat".');
  if (!results.browser) warn('Sans navigateur : le scraping d\'emails ne marchera pas (mais OSM peut fournir des emails directs).', 'npx playwright install chromium');
  if (!results.anthropic) warn('Sans clé API valide : les leads seront sourcés mais NI qualifiés NI transformés en emails.', 'Nouvelle clé sur platform.claude.com');
  console.log(`\n${C.d}Relance ce diagnostic après correction : npm run doctor${C.x}\n`);
  process.exit(0);
}

main().catch((e) => { console.error('Diagnostic planté :', e); process.exit(1); });
