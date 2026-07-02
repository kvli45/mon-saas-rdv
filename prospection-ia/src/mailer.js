import nodemailer from 'nodemailer';
import { config } from './config.js';
import { publish } from './bus.js';

let transporter = null;

function getTransport() {
  if (transporter) return transporter;
  if (config.mail.provider === 'gmail') {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: config.mail.gmailUser, pass: config.mail.gmailAppPassword },
    });
  }
  return transporter;
}

/** Vérifie que le SMTP Gmail répond (utile au démarrage du dashboard). */
export async function verifyMailer() {
  if (config.mail.dryRun) return { ok: true, mode: 'DRY_RUN (aucun email réel envoyé)' };
  if (config.mail.provider === 'gmail') {
    try {
      await getTransport().verify();
      return { ok: true, mode: `Gmail SMTP (${config.mail.gmailUser})` };
    } catch (err) {
      return { ok: false, mode: `Gmail SMTP erreur : ${err.message}` };
    }
  }
  return { ok: !!config.mail.brevoKey, mode: 'Brevo API' };
}

function toHtml(text) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${text
    .split('\n')
    .map((l) => (l.trim() === '--' ? '<hr style="border:none;border-top:1px solid #ddd;margin:14px 0">' : `<p style="margin:0 0 10px">${l || '&nbsp;'}</p>`))
    .join('')}</div>`;
}

/**
 * Envoie un email. `to`, `toName`, `subject`, `body` (texte brut).
 * Ajoute le pied opt-out RGPD. Respecte DRY_RUN (simulation).
 */
export async function sendMail({ to, toName, subject, body }) {
  const full = `${body}\n\n--\n${config.optoutText}`;

  if (config.mail.dryRun) {
    publish('mail_dryrun', { to, subject });
    return { dryRun: true, id: 'dry-' + Date.now() };
  }

  if (config.mail.provider === 'gmail') {
    const info = await getTransport().sendMail({
      from: `"${config.sender.name}" <${config.mail.gmailUser}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      text: full,
      html: toHtml(full),
    });
    return { id: info.messageId };
  }

  // Brevo (option)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.mail.brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: config.sender.email, name: config.sender.name },
      to: [{ email: to, name: toName }],
      subject,
      textContent: full,
      htmlContent: toHtml(full),
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
