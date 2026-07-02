import { chromium } from 'playwright';
import dns from 'node:dns/promises';
import { config } from './config.js';
import { publish } from './bus.js';

let browser = null;
let ctx = null;

/* ---------------- Empreintes navigateur (rotation) ---------------- */
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];
const VIEWPORTS = [{ width: 1366, height: 900 }, { width: 1440, height: 900 }, { width: 1536, height: 864 }, { width: 1920, height: 1080 }];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export async function initBrowser() {
  if (browser) return;
  const launchOpts = {
    headless: config.scraper.headless,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  };
  if (config.scraper.chromePath) launchOpts.executablePath = config.scraper.chromePath;
  browser = await chromium.launch(launchOpts);
  ctx = await browser.newContext({
    userAgent: pick(UAS),
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: pick(VIEWPORTS),
    deviceScaleFactor: 1,
    bypassCSP: true,
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Upgrade-Insecure-Requests': '1',
    },
  });
  // Furtivité : neutralise les signaux d'automatisation les plus courants
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    window.chrome = { runtime: {}, app: {}, csi: () => {}, loadTimes: () => {} };
    const orig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (p) {
      if (p === 37445) return 'Intel Inc.';
      if (p === 37446) return 'Intel Iris OpenGL Engine';
      return orig.call(this, p);
    };
  });
  // Vitesse + discrétion : ne charge pas images / polices / médias
  await ctx.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (t === 'image' || t === 'media' || t === 'font') return route.abort();
    return route.continue();
  });
  publish('scraper', { msg: 'Navigateur furtif initialisé (stealth + blocage médias)' });
}

export async function closeBrowser() {
  if (browser) await browser.close().catch(() => {});
  browser = null;
  ctx = null;
}

/* ---------------- Décodage Cloudflare email-protection ---------------- */
function decodeCfEmail(hex) {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let email = '';
    for (let i = 2; i < hex.length; i += 2) email += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return email;
  } catch {
    return null;
  }
}

/* ---------------- Rendu d'une page + extraction riche ---------------- */
async function renderPage(url, { waitMs = 900, retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 });
      if (!resp) throw new Error('no response');
      if (resp.status() >= 400) { await page.close(); return null; }
      await page.waitForTimeout(waitMs + Math.random() * 500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});

      const data = await page.evaluate(() => {
        const out = { text: document.body?.innerText || '', mailtos: [], tels: [], cfemails: [], jsonld: [], links: [], socials: [] };
        document.querySelectorAll('a[href^="mailto:"]').forEach((a) => out.mailtos.push(a.getAttribute('href')));
        document.querySelectorAll('a[href^="tel:"]').forEach((a) => out.tels.push(a.getAttribute('href')));
        // Cloudflare : attribut data-cfemail (avant décodage JS)
        document.querySelectorAll('[data-cfemail]').forEach((e) => out.cfemails.push(e.getAttribute('data-cfemail')));
        document.querySelectorAll('a[href*="/cdn-cgi/l/email-protection#"]').forEach((a) => {
          const h = a.getAttribute('href').split('#')[1]; if (h) out.cfemails.push(h);
        });
        // Données structurées schema.org
        document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { out.jsonld.push(s.textContent); } catch {} });
        // Liens internes (pour découvrir contact / mentions / équipe)
        document.querySelectorAll('a[href]').forEach((a) => {
          const href = a.getAttribute('href') || '';
          const txt = (a.textContent || '').trim().toLowerCase();
          out.links.push({ href, txt });
          if (/facebook|instagram|linkedin/i.test(href)) out.socials.push(href);
        });
        return out;
      });

      // HTML brut aussi (au cas où l'email est en attribut / commentaire)
      data.html = await page.content();
      await page.close();
      return data;
    } catch {
      await page.close().catch(() => {});
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 + attempt * 800));
    }
  }
  return null;
}

/* ---------------- Extraction & scoring des emails ---------------- */
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const JUNK = /\.(png|jpe?g|gif|webp|svg|css|js|woff2?|ico)$|sentry|wixpress|cloudflare|\.wix|@sentry|example\.|@2x|@3x|u002F|placeholder|yourdomain|domain\.com|email@|nom@/i;

function deobfuscate(raw) {
  return String(raw)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s*[\[\(]\s*(?:at|arobase|chez)\s*[\]\)]\s*/gi, '@')
    .replace(/\s*[\[\(]\s*(?:dot|point)\s*[\]\)]\s*/gi, '.')
    .replace(/\s+@\s+/g, '@');
}

function scoreEmail(e, domain) {
  let s = 30;
  if (domain && e.endsWith('@' + domain)) s += 45; // même domaine = le Graal
  if (/^(contact|commande|commercial|achat|achats|gestion|direction|dirigeant|gerant|patron|info|infos|bonjour|hello|accueil|pro|devis)@/.test(e)) s += 30;
  if (/^(rgpd|dpo|webmaster|admin|postmaster|abuse|hostmaster|support|newsletter|marketing|press|presse|recrutement|job|cv)@/.test(e)) s -= 25;
  if (/@(gmail|outlook|hotmail|yahoo|orange|free|wanadoo|sfr|laposte|live|icloud)\./.test(e)) s -= 12; // perso : gardé mais moins prioritaire
  return s;
}

function extractEmails(data, domain) {
  const found = new Map();
  const add = (raw, base) => {
    let e = deobfuscate(raw).toLowerCase().trim().replace(/^mailto:/, '').split('?')[0].replace(/[.,;:]+$/, '');
    if (!e || JUNK.test(e) || e.length > 64 || e.split('@').length !== 2) return;
    const sc = base + scoreEmail(e, domain);
    found.set(e, Math.max(found.get(e) || 0, sc));
  };

  for (const m of data.mailtos || []) add(decodeURIComponent(m), 30);
  for (const hex of data.cfemails || []) { const d = decodeCfEmail(hex); if (d) add(d, 45); } // Cloudflare décodé = fiable
  for (const raw of data.jsonld || []) {
    try {
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (typeof o.email === 'string') add(o.email.replace(/^mailto:/i, ''), 40);
        for (const v of Object.values(o)) (Array.isArray(v) ? v : [v]).forEach((x) => typeof x === 'object' && walk(x));
      };
      walk(JSON.parse(raw));
    } catch {}
  }
  const blob = deobfuscate(`${data.text || ''}\n${data.html || ''}`);
  for (const m of blob.matchAll(EMAIL_RE)) add(m[0], 20);

  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([email, score]) => ({ email, score }));
}

function extractPhone(data) {
  for (const t of data.tels || []) {
    const p = t.replace(/^tel:/i, '').replace(/[^\d+]/g, '');
    if (p.replace(/\D/g, '').length >= 9) return p;
  }
  const m = (data.text || '').match(/(?:\+33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}/);
  return m ? m[0].replace(/[^\d+]/g, '') : null;
}

/* ---------------- Vérification MX (le domaine reçoit-il des emails ?) ---------------- */
const mxCache = new Map();
async function domainAcceptsMail(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  let ok = false;
  try { const mx = await dns.resolveMx(domain); ok = Array.isArray(mx) && mx.length > 0; } catch { ok = false; }
  mxCache.set(domain, ok);
  return ok;
}

/* ---------------- Découverte des pages candidates ---------------- */
const KEYWORDS = /contact|mentions|legal|légal|propos|about|equipe|équipe|team|qui-sommes|nous-|coordonn|infos?-pratiques|impressum/i;
const FALLBACK_PATHS = ['/contact', '/contactez-nous', '/nous-contacter', '/mentions-legales', '/a-propos'];

function candidatePages(base, homeLinks) {
  const set = new Set([base]);
  let host;
  try { host = new URL(base).hostname; } catch { return [...set]; }
  for (const { href, txt } of homeLinks || []) {
    if (!KEYWORDS.test(href) && !KEYWORDS.test(txt)) continue;
    try {
      const u = new URL(href, base);
      if (u.hostname.replace(/^www\./, '') === host.replace(/^www\./, '')) set.add(u.origin + u.pathname.replace(/\/+$/, ''));
    } catch {}
    if (set.size >= 7) break;
  }
  for (const p of FALLBACK_PATHS) { if (set.size >= 8) break; set.add(base + p); }
  return [...set];
}

async function readSitemap(base) {
  try {
    const res = await fetch(base + '/sitemap.xml', { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => KEYWORDS.test(u)).slice(0, 4);
  } catch {
    return [];
  }
}

/* ---------------- Scrape complet d'un prospect ---------------- */
export async function scrapeSite(website, name = '') {
  await initBrowser();
  let base, domain;
  try {
    const u = new URL(website.startsWith('http') ? website : 'https://' + website);
    base = u.origin;
    domain = u.hostname.replace(/^www\./, '');
  } catch {
    return { email: null, excerpt: null, phone: null, socials: [], tried: 0 };
  }

  // 1) page d'accueil (sert aussi à découvrir les liens internes)
  const home = await renderPage(base, { waitMs: 1000 });
  const excerpt = home?.text ? home.text.replace(/\s+/g, ' ').trim().slice(0, 3000) : null;

  // 2) pages candidates = liens internes pertinents + sitemap + fallback
  const fromLinks = candidatePages(base, home?.links || []);
  const fromSitemap = await readSitemap(base);
  const pages = [...new Set([...fromLinks, ...fromSitemap])].filter((p) => p !== base).slice(0, 7);

  const allData = [];
  if (home) allData.push(home);

  // 3) rendu concurrent (par lots de 3) des pages candidates
  let tried = 1;
  for (let i = 0; i < pages.length; i += 3) {
    const batch = pages.slice(i, i + 3);
    const results = await Promise.all(batch.map((p) => renderPage(p, { waitMs: 700 })));
    tried += batch.length;
    for (const r of results) if (r) allData.push(r);
    // stop tôt si on a déjà un très bon email
    const partial = allData.flatMap((d) => extractEmails(d, domain));
    if (partial.some((e) => e.score >= 90)) break;
  }

  // 4) agrège, vérifie la délivrabilité (MX)
  let candidates = allData.flatMap((d) => extractEmails(d, domain))
    .sort((a, b) => b.score - a.score);
  // dédoublonne en gardant le meilleur score
  const seen = new Map();
  for (const c of candidates) if (!seen.has(c.email) || seen.get(c.email) < c.score) seen.set(c.email, c.score);
  candidates = [...seen.entries()].map(([email, score]) => ({ email, score })).sort((a, b) => b.score - a.score);

  let best = null;
  for (const c of candidates.slice(0, 6)) {
    const dom = c.email.split('@')[1];
    const mx = await domainAcceptsMail(dom);
    if (mx) { best = { ...c, score: c.score + 20, mx: true }; break; } // 1er email délivrable
    if (!best) best = c; // garde le meilleur même sans MX confirmé
  }

  // Dernier recours : deviner contact@domaine si le domaine reçoit bien des emails (MX)
  if (!best && config.scraper.guessEmail && domain && await domainAcceptsMail(domain)) {
    best = { email: `contact@${domain}`, score: 55, mx: true, guessed: true };
  }

  const phone = allData.map(extractPhone).find(Boolean) || null;
  const socials = [...new Set(allData.flatMap((d) => d.socials || []))].slice(0, 3);

  publish('scraper', {
    msg: `${name || domain} — ${best ? `email ${best.email} (score ${best.score}${best.mx ? ', MX✓' : ''})` : 'aucun email'}${phone ? ' · ☎ ' + phone : ''}`,
    ok: !!best,
  });
  return { email: best?.email || null, emailScore: best?.score ?? null, emailMx: !!best?.mx, excerpt, phone, socials, tried };
}

/* ---------------- Résolution de site web (nom + ville -> URL) ---------------- */
const DIR_BLOCK = /google\.|facebook|instagram|linkedin|pagesjaunes|yelp|tripadvisor|leboncoin|mappy|societe\.com|wikipedia|youtube|duckduckgo|openstreetmap|infogreffe|verif\.com|indeed|glassdoor|\.gouv\.fr/i;
export async function searchWebsite(name, city = '') {
  if (!name) return null;
  await initBrowser();
  const page = await ctx.newPage();
  try {
    const q = encodeURIComponent(`${name} ${city}`.trim());
    await page.goto(`https://html.duckduckgo.com/html/?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(700);
    const hrefs = await page.$$eval('a.result__a', (els) => els.map((e) => e.href)).catch(() => []);
    for (const href of hrefs.slice(0, 8)) {
      let host; try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { continue; }
      if (DIR_BLOCK.test(host)) continue;
      return 'https://' + host; // 1er domaine "site officiel" plausible
    }
    return null;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/* ---------------- Fallback Hunter.io ---------------- */
export async function hunterLookup(domain) {
  if (!config.hunterKey) return null;
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&api_key=${config.hunterKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    const emails = (data?.data?.emails || []).filter((e) => e.value);
    const pref = emails.find((e) => /generic/i.test(e.type)) || emails.find((e) => /ceo|owner|director|manager|founder|gérant|dirigeant/i.test(e.position || '')) || emails[0];
    return pref?.value || null;
  } catch {
    return null;
  }
}
