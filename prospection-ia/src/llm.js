import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

const client = new Anthropic({ apiKey: config.anthropicKey });

async function structured({ model, system, prompt, schema, maxTokens = 2048 }) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error('LLM refusal');
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  return JSON.parse(text);
}

const QUALIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'decision', 'reason', 'hooks'],
  properties: {
    score: { type: 'integer', description: 'Pertinence 0-100 comme acheteur B2B de produits de nettoyage/detailing auto' },
    decision: { type: 'string', enum: ['accept', 'reject'] },
    reason: { type: 'string', description: '1 phrase expliquant le score' },
    hooks: {
      type: 'array',
      description: '1 à 3 éléments concrets et spécifiques à CE prospect, utilisables pour personnaliser un cold email',
      items: { type: 'string' },
    },
  },
};

const QUALIFY_SYSTEM = `Tu es l'analyste de qualification de leads de CleanTech, marque française de produits de nettoyage et detailing automobile (APC multi-surfaces, nettoyant jantes, décontaminant ferreux, nettoyant vitres, shampoing carrosserie, quick detailer, microfibres, éponges). Nos clients B2B idéaux achètent des consommables de nettoyage auto en volume régulier : detailers, centres de lavage, garages, carrossiers, négociants VO, loueurs, flottes VTC.

Tu évalues des fiches d'entreprises françaises. Score élevé si : l'activité implique de nettoyer des véhicules régulièrement, l'entreprise semble active (avis récents, site web vivant), taille artisan/PME (décideur joignable). Score bas si : activité hors sujet, entreprise fermée ou fantôme, grand groupe (achats centralisés inaccessibles), particulier. Refuse (reject) sous 40.

Pour les hooks : cherche du CONCRET dans les données fournies (spécialité affichée, phrase du site, note Google, ancienneté, service particulier). Jamais de flatterie générique.`;

export async function qualifyLead(lead) {
  const prompt = `Fiche prospect :
- Nom : ${lead.name}
- Secteur ciblé : ${lead.sector_label}
- Ville : ${lead.city}
- Adresse : ${lead.address || 'n/c'}
- Note Google : ${lead.rating ?? 'n/c'} (${lead.reviews ?? 0} avis)
- Site web : ${lead.website || 'aucun'}
- Extrait du site : """${(lead.site_excerpt || '').slice(0, 2500)}"""

Évalue ce prospect pour CleanTech.`;
  return structured({
    model: config.qualifyModel,
    system: QUALIFY_SYSTEM,
    prompt,
    schema: QUALIFY_SCHEMA,
  });
}

const COMPOSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'body'],
  properties: {
    subject: { type: 'string', description: 'Objet court (max 55 caractères), sans emoji, sans majuscules criardes' },
    body: { type: 'string', description: 'Corps du mail en texte brut avec sauts de ligne. 90-130 mots max.' },
  },
};

// NOTE: schémas figés => cache de compilation côté API, et prompts system stables => prompt caching.
const COMPOSE_SYSTEM = `Tu écris les cold emails B2B de ${'{company}'}, marque française de produits de nettoyage & detailing automobile professionnels (gamme : APC multi-surfaces, nettoyant jantes, décontaminant ferreux Iron Cleaner, nettoyant vitres, shampoing Candy Foam, quick detailer Gloss Finish, microfibres et éponges — formulés en France, prêts à l'emploi, expédition 24h, satisfait ou remboursé 30 jours).

Règles d'or :
1. FRANÇAIS naturel, ton pro mais direct, tutoiement interdit (vouvoiement).
2. PERSONNALISATION réelle : la 1ère phrase doit prouver qu'on a regardé LEUR entreprise (utilise les hooks fournis). Jamais de "J'espère que vous allez bien".
3. ANGLE MÉTIER : adapte l'argument au secteur (detailer → qualité de finition et marge produit ; garage → gain de temps et image client ; loueur/flotte → coût par véhicule et rotation rapide ; carrossier → préparation avant livraison ; négociant VO → véhicules qui se vendent plus vite propres).
4. UNE seule proposition de valeur + UN call-to-action simple (réponse ou échantillon/devis). Pas de lien multiple, pas de pièce jointe.
5. Mentionne le code promo s'il est fourni, naturellement.
6. 90-130 mots. Signature : Prénom + société + téléphone (fournis). Le pied opt-out sera ajouté automatiquement, ne l'écris pas.
7. Pour une RELANCE : fais court (50-80 mots), référence le 1er mail sans culpabiliser, apporte UN élément nouveau (argument différent, question directe, ou l'offre). Relance 2 = dernier message, poli, "je clos le dossier".`;

export async function composeEmail(lead, { touchNumber }) {
  const hooks = JSON.parse(lead.hooks || '[]');
  const kind =
    touchNumber === 0 ? 'PREMIER contact' : touchNumber === 1 ? 'RELANCE 1 (après ~3 jours sans réponse)' : 'RELANCE 2 — dernier message (après ~7 jours)';
  const prompt = `Type de message : ${kind}

Prospect :
- Entreprise : ${lead.name} (${lead.sector_label}, ${lead.city})
- Accroches de personnalisation : ${hooks.map((h) => `« ${h} »`).join(' | ') || 'aucune — reste factuel sur leur métier'}
- Note Google : ${lead.rating ?? 'n/c'} (${lead.reviews ?? 0} avis)
${touchNumber > 0 ? `- Objet du 1er mail envoyé : « ${lead.email_subject} »` : ''}

Expéditeur :
- ${config.sender.name}, ${config.company.name} (${config.company.website})
- Téléphone : ${config.company.phone || 'n/c'}
- Code promo première commande : ${config.company.promoCode || 'aucun'}

Écris le mail.`;
  return structured({
    model: config.composeModel,
    system: COMPOSE_SYSTEM.replace('{company}', config.company.name),
    prompt,
    schema: COMPOSE_SCHEMA,
  });
}
