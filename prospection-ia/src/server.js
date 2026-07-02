import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db, counts, logEvent, suppress } from './db.js';
import { bus, recent } from './bus.js';
import { verifyMailer } from './mailer.js';
import { setPaused, isPaused } from './pipeline/send.js';
import { log } from './log.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DASH = fs.readFileSync(path.join(ROOT, 'public', 'dashboard.html'), 'utf8');

let mailerStatus = { ok: false, mode: 'non vérifié' };
verifyMailer().then((s) => { mailerStatus = s; });

function json(res, obj, code = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}

function stats() {
  const c = counts();
  const today = Object.fromEntries(
    db.prepare(`SELECT type, COUNT(*) n FROM events WHERE date(created_at)=date('now') GROUP BY type`).all().map((r) => [r.type, r.n])
  );
  const bySector = db.prepare(
    `SELECT sector_label AS s, COUNT(*) n, SUM(status='CONTACTED' OR status LIKE 'FOLLOWUP%' OR status='EXHAUSTED' OR status='REPLIED') sent
     FROM leads GROUP BY sector_label ORDER BY n DESC`
  ).all();
  return {
    counts: c, today, bySector,
    mailer: mailerStatus,
    paused: isPaused(),
    dryRun: config.mail.dryRun,
    quotas: config.quotas,
    sentTodayNew: today.SENT || 0,
    sentTodayFollow: today.FOLLOWUP || 0,
    provider: config.mail.provider,
    company: config.company.name,
  };
}

export function startServer(onScrape) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(DASH);
    }

    // Flux temps réel (SSE)
    if (p === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
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

    if (p === '/api/emails') {
      return json(res, db.prepare(
        `SELECT id,lead_id,kind,to_email,to_name,sector,city,score,subject,body,created_at
         FROM emails ORDER BY id DESC LIMIT 200`
      ).all());
    }

    if (p === '/api/lead') {
      const id = +url.searchParams.get('id');
      const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(id);
      const events = db.prepare(`SELECT type,detail,created_at FROM events WHERE lead_id = ? ORDER BY id`).all(id);
      return json(res, { lead, events, hooks: JSON.parse(lead?.hooks || '[]') });
    }

    if (req.method === 'POST' && p === '/api/scrape') {
      onScrape?.();
      return json(res, { ok: true, msg: 'Cycle de scraping lancé' });
    }

    if (req.method === 'POST' && p === '/api/pause') {
      const b = await readBody(req);
      setPaused(b.paused);
      log(b.paused ? '⏸️  Envois mis en pause depuis le dashboard' : '▶️  Envois repris depuis le dashboard');
      return json(res, { paused: isPaused() });
    }

    if (req.method === 'POST' && p === '/api/mark') {
      const b = await readBody(req);
      const MAP = { replied: 'REPLIED', optout: 'OPTOUT', bounced: 'BOUNCED' };
      const lead = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(+b.id);
      if (!lead || !MAP[b.action]) return json(res, { error: 'invalide' }, 400);
      db.prepare(`UPDATE leads SET status=?, updated_at=datetime('now') WHERE id=?`).run(MAP[b.action], lead.id);
      logEvent(lead.id, MAP[b.action], 'marqué depuis le dashboard');
      if (b.action !== 'replied' && lead.email) suppress(lead.email, b.action);
      return json(res, { ok: true, status: MAP[b.action] });
    }

    res.writeHead(404); res.end('not found');
  });

  server.listen(config.serverPort, () => {
    log(`🖥️  Dashboard : http://localhost:${config.serverPort}`);
  });
  return server;
}
