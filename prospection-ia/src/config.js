import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Charge .env sans dépendance externe
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const int = (v, d) => (v !== undefined && v !== '' ? parseInt(v, 10) : d);

export const config = {
  root: ROOT,
  dbPath: path.join(ROOT, 'prospector.db'),

  anthropicKey: process.env.ANTHROPIC_API_KEY,
  qualifyModel: process.env.QUALIFY_MODEL || 'claude-opus-4-8',
  composeModel: process.env.COMPOSE_MODEL || 'claude-opus-4-8',

  placesKey: process.env.GOOGLE_PLACES_API_KEY,
  brevoKey: process.env.BREVO_API_KEY,
  hunterKey: process.env.HUNTER_API_KEY || null,

  sender: {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME || 'CleanTech',
  },
  company: {
    name: process.env.COMPANY_NAME || 'CleanTech',
    website: process.env.COMPANY_WEBSITE || 'https://cleantech-auto.fr',
    phone: process.env.SIGNATURE_PHONE || '',
    promoCode: process.env.PROMO_CODE || '',
  },
  optoutText:
    process.env.OPTOUT_TEXT ||
    'Vous recevez cet email dans un cadre professionnel. Répondez "STOP" pour ne plus être contacté.',

  quotas: {
    newPerDay: int(process.env.MAX_NEW_EMAILS_PER_DAY, 20),
    followupsPerDay: int(process.env.MAX_FOLLOWUPS_PER_DAY, 20),
  },
  sendWindow: {
    start: int(process.env.SEND_HOUR_START, 9),
    end: int(process.env.SEND_HOUR_END, 18),
  },
  followupDays: [int(process.env.FOLLOWUP_1_DAYS, 3), int(process.env.FOLLOWUP_2_DAYS, 7)],
  minScore: int(process.env.MIN_QUALIFY_SCORE, 60),
  cycleMinutes: int(process.env.CYCLE_MINUTES, 15),
  dailyReportEmail: process.env.DAILY_REPORT_EMAIL || null,
};

// ============ CIBLES B2B ============
// Le pipeline croise chaque secteur avec chaque ville (rotation automatique).
// Ajoute/retire librement — l'état de rotation est conservé en base.
export const SECTORS = [
  { key: 'detailing', query: 'detailing automobile', label: 'Centre de detailing / esthétique auto' },
  { key: 'lavage', query: 'centre de lavage auto', label: 'Centre de lavage automobile' },
  { key: 'nettoyage_auto', query: 'nettoyage automobile', label: 'Entreprise de nettoyage automobile' },
  { key: 'garage', query: 'garage automobile', label: 'Garage / atelier mécanique' },
  { key: 'carrosserie', query: 'carrosserie automobile', label: 'Carrossier / peintre auto' },
  { key: 'concession', query: 'concession automobile occasion', label: 'Concession / négociant VO' },
  { key: 'location', query: 'location de voitures agence locale', label: 'Loueur de véhicules' },
  { key: 'vtc', query: 'société VTC chauffeur privé', label: 'Flotte VTC / chauffeurs privés' },
];

export const CITIES = [
  'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier',
  'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne',
  'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Clermont-Ferrand',
  'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges',
  'Annecy', 'Perpignan', 'Metz', 'Orléans', 'Rouen', 'Mulhouse', 'Caen',
  'Nancy', 'Avignon', 'Cannes',
];

export function assertConfig() {
  const missing = [];
  if (!config.anthropicKey) missing.push('ANTHROPIC_API_KEY');
  if (!config.placesKey) missing.push('GOOGLE_PLACES_API_KEY');
  if (!config.brevoKey) missing.push('BREVO_API_KEY');
  if (!config.sender.email) missing.push('SENDER_EMAIL');
  if (missing.length) {
    throw new Error(
      `Configuration incomplète — variables manquantes dans .env : ${missing.join(', ')}\n` +
      `Copie .env.example vers .env puis remplis les clés.`
    );
  }
}
