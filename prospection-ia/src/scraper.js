import { chromium } from 'playwright';
import { config } from './config.js';
import { publish } from './bus.js';

let browser = null;
let ctx = null;

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export async function initBrowser() {
  if (browser) return;
  const launchOpts = { headless: config.scraper.headless, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] };
  if (config.scraper.chromePath) launchOpts.executablePath = config.scraper.chromePath;
  browser = await chromium.launch(launchOpts);
  ctx = await browser.newContext({
    userAgent: pick(UAS),
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
  });
  // Masque les signaux d'automatisation (bypass des murs anti-bot basiques)
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });
  publish('scraper', { msg: 'Navigateur furtif initialisé' });
}

export async function closeBrowser() {
  if (browser) await browser.close().catch(() => {});
  browser = null;
  ctx = null;
}

/** Rend une page (JS inclus) et renvoie {html, text}. null si échec/blocage. */
async function renderPage(url, { waitMs = 1200 } = {}) {
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!resp) return null;
    const status = resp.status();
    if (status >= 400) return null;
    await page.waitForTimeout(waitMs + Math.random() * 800); // laisse le JS peupler + rythme humain
    // révèle les mailto obfusqués et le contenu bas de page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    const html = await page.content();
    const text = await page.evaluate(() => document.body?.innerText || '');
    const mailtos = await page.$$eval('a[href^="mailto:"]', (els) => els.map((e) => e.getAttribute('href'))).catch(() => []);
    return { html, text, mailtos };
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const JUNK = /\.(png|jpe?g|gif|webp|svg|css|js|woff2?)$|sentry|wixpress|cloudflare|@sentry|example\.|@2x|@3x|u002F|no-?reply|noreply|@email\.|placeholder/i;

// Dé-obfuscation : "nom [at] domaine [dot] fr", "nom (arobase) …", entités HTML
function deobfuscate(raw) {
  return raw
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s*\[?\(?\s*(?:at|arobase|@)\s*\]?\)?\s*/gi, '@')
    .replace(/\s*\[?\(?\s*(?:dot|point)\s*\]?\)?\s*/gi, '.')
    .replace(/\s+@/g, '@')
    .replace(/@\s+/g, '@');
}

function extractEmails({ html, text, mailtos = [] }, domain) {
  const found = new Map(); // email -> score
  const add = (e, base) => {
    e = e.toLowerCase().trim().replace(/[.,;:]$/, '');
    if (!e || JUNK.test(e) || e.length > 60 || e.split('@').length !== 2) return;
    let score = base;
    if (domain && e.endsWith('@' + domain)) score += 40; // même domaine = ultra qualifié
    if (/^(contact|commande|achat|achats|gestion|direction|gerant|patron|info|bonjour|hello|accueil|pro)@/.test(e)) score += 25;
    if (/^(rgpd|webmaster|admin|postmaster|abuse|support|newsletter|marketing)@/.test(e)) score -= 20;
    if (/gmail\.com|outlook|hotmail|yahoo|orange\.fr|free\.fr|wanadoo/.test(e)) score -= 10; // perso = moins pro mais garde
    found.set(e, Math.max(found.get(e) || 0, score));
  };

  for (const m of mailtos) add(deobfuscate(decodeURIComponent(m.replace(/^mailto:/i, '').split('?')[0])), 60);
  const blob = deobfuscate(`${text}\n${html}`);
  for (const m of blob.matchAll(EMAIL_RE)) add(m[0], 30);

  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([email, score]) => ({ email, score }));
}

const CONTACT_PATHS = ['', '/contact', '/contactez-nous', '/nous-contacter', '/mentions-legales', '/mentions-legales/', '/a-propos', '/qui-sommes-nous'];

/**
 * Scrape un prospect à partir de son site : rend chaque page candidate,
 * agrège les emails, garde le meilleur + un extrait pour la personnalisation.
 * Renvoie { email, emailScore, excerpt, tried } ou email=null.
 */
export async function scrapeSite(website, name = '') {
  await initBrowser();
  let domain = null;
  try { domain = new URL(website).hostname.replace(/^www\./, ''); } catch { return { email: null, excerpt: null, tried: 0 }; }

  const base = website.replace(/\/+$/, '');
  let best = null;
  let excerpt = null;
  let tried = 0;

  for (const p of CONTACT_PATHS) {
    const rendered = await renderPage(base + p);
    tried++;
    if (!rendered) continue;
    if (!excerpt && rendered.text) excerpt = rendered.text.replace(/\s+/g, ' ').trim().slice(0, 3000);
    const emails = extractEmails(rendered, domain);
    if (emails.length && (!best || emails[0].score > best.score)) best = emails[0];
    if (best && best.score >= 65) break; // email de qualité trouvé, on arrête
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
  }

  publish('scraper', { msg: `${name || domain} — ${best ? `email ${best.email} (score ${best.score})` : 'aucun email'}`, ok: !!best });
  return { email: best?.email || null, emailScore: best?.score ?? null, excerpt, tried };
}

/** Fallback Hunter.io (domaine → email pro), si clé fournie. */
export async function hunterLookup(domain) {
  if (!config.hunterKey) return null;
  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&api_key=${config.hunterKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    const emails = (data?.data?.emails || []).filter((e) => e.value);
    // privilégie contact générique ou décideur
    const pref = emails.find((e) => /generic/i.test(e.type)) || emails.find((e) => /ceo|owner|director|manager|founder/i.test(e.position || '')) || emails[0];
    return pref?.value || null;
  } catch {
    return null;
  }
}
