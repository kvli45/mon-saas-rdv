import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db, counts, logEvent, suppress, draftsReadyCount } from './db.js';
import { bus, recent, publish } from './bus.js';
import { verifyMailer } from './mailer.js';
import { sendReady, sendAllReady } from './pipeline/send.js';
import { setScrape, scrapeOn } from './control.js';
import { log } from './log.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DASH = fs.readFileSync(path.join(ROOT, 'public', 'dashboard.html'), 'utf8');

let mailerStatus = { ok: false, mode: 'non vérifié' };
verifyMailer().then((s) => { mailerStatus = s; });

const json = (res, obj, code = 200) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
};
const readBody = (req) => new Promise((resolve) => {
  let b = ''; req.on('data', (c) => (b += c));
  req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
});

function stats() {
  const c = counts();
  const today = Object.fromEntries(
    db.prepare(`SELECT type, COUNT(*) n FROM events WHERE date(created_at)=date('now') GROUP BY type`).all().map((r) => [r.type, r.n])
  );
  return {
    counts: c, today,
    mailer: mailerStatus,
    scraping: scrapeOn(),
    dryRun: config.mail.dryRun,
    quotas: config.quotas,
    draftsReady: draftsReadyCount(),
    sentTodayNew: today.SENT || 0,
    provider: config.mail.provider,
    company: config.company.name,
  };
}

export function startServer(hooks = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(DASH);
    }

    if (p === '/api/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      for (const e of recent()) res.write(`data: ${JSON.stringify(e)}\n\n`);
      const onEvt = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
      bus.on('evt', onEvt);
      const ping = setInterval(() => res.write(': ping\n\n'), 25000);
      req.on('close', () => { clearInterval(ping); bus.off('evt', onEvt); });
      return;
    }

    if (p === '/api/stats') return json(res, stats());

    if (p === '/api/leads') {
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');
      let sql = `SELECT id,name,sector_label,city,email,phone,website,rating,reviews,score,status,qualify_reason,touches,contacted_at FROM leads`;
      const cond = [], args = [];
      if (status) { cond.push('status = ?'); args.push(status); }
      if (q) { cond.push('(name LIKE ? OR city LIKE ? OR email LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
      sql += ' ORDER BY updated_at DESC LIMIT 300';
      return json(res, db.prepare(sql).all(...args));
    }

    // Brouillons PRÊTS à envoyer (email déjà rédigé, en attente de ton clic)
    if (p === '/api/drafts') {
      return json(res, db.prepare(
        `SELECT id,name,sector_label,city,email,score,draft_touch,draft_subject,draft_body
         FROM leads WHERE draft_body IS NOT NULL ORDER BY draft_touch, score DESC LIMIT 200`
      ).all());
    }

    // Export CSV de tous les leads (email + téléphone + statut) — pour Excel / phoning
    if (p === '/api/export.csv') {
      const rows = db.prepare(`SELECT name,sector_label,city,address,phone,email,website,score,status,contacted_at FROM leads ORDER BY status,score DESC`).all();
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = ['Entreprise', 'Secteur', 'Ville', 'Adresse', 'Téléphone', 'Email', 'Site', 'Score', 'Statut', 'Contacté le'];
      const csv = '﻿' + [header.join(';'), ...rows.map((r) => [r.name, r.sector_label, r.city, r.address, r.phone, r.email, r.website, r.score, r.status, r.contacted_at].map(esc).join(';'))].join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads-cleantech.csv"' });
      return res.end(csv);
    }

    if (p === '/api/emails') {
      return json(res, db.prepare(
        `SELECT id,lead_id,kind,to_email,to_name,sector,city,score,subject,body,created_at FROM emails ORDER BY id DESC LIMIT 200`
      ).all());
    }

    // ---- Contrôle du SCRAPING ----
    if (req.method === 'POST' && p === '/api/scrape/start') {
      setScrape(true); log('▶️  Scraping DÉMARRÉ depuis le dashboard'); hooks.onScrapeStart?.();
      return json(res, { scraping: true });
    }
    if (req.method === 'POST' && p === '/api/scrape/stop') {
      setScrape(false); log('⏹️  Scraping ARRÊTÉ depuis le dashboard');
      return json(res, { scraping: false });
    }

    // ---- ENVOI manuel ----
    if (req.method === 'POST' && p === '/api/send') {
      const b = await readBody(req);
      const r = await sendReady(+b.id);
      return json(res, r, r.ok ? 200 : 400);
    }
    if (req.method === 'POST' && p === '/api/send-all') {
      const r = await sendAllReady((sent, total) => publish('log', { level: 'info', msg: `Envoi groupé : ${sent}/${total}` }));
      return json(res, r);
    }

    // ---- Marquage lead ----
    if (req.method === 'POST' && p === '/api/mark') {
      const b = await readBody(req);
      const MAP = { replied: 'REPLIED', optout: 'OPTOUT', bounced: 'BOUNCED' };
      const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(+b.id);
      if (!lead || !MAP[b.action]) return json(res, { error: 'invalide' }, 400);
      db.prepare(`UPDATE leads SET status=?, draft_body=NULL, draft_subject=NULL, draft_touch=NULL, updated_at=datetime('now') WHERE id=?`).run(MAP[b.action], lead.id);
      logEvent(lead.id, MAP[b.action], 'marqué depuis le dashboard');
      if (b.action !== 'replied' && lead.email) suppress(lead.email, b.action);
      return json(res, { ok: true, status: MAP[b.action] });
    }

    res.writeHead(404); res.end('not found');
  });

  server.listen(config.serverPort, () => log(`🖥️  Dashboard : http://localhost:${config.serverPort}`));
  return server;
}
