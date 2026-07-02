# 🤖 CleanTech Prospector — Prospection B2B autonome par IA

Pipeline de prospection qui tourne **24h/24** pour vendre les produits CleanTech aux professionnels de l'auto (detailers, centres de lavage, garages, carrossiers, négociants VO, loueurs, flottes VTC).

## Ce que ça fait, en boucle

```
 SOURCING ──► ENRICHISSEMENT ──► QUALIFICATION IA ──► COLD EMAIL PERSO ──► RELANCES J+3/J+7
 Google Places   visite le site      Claude score         Claude rédige        auto, stop si
 (secteur×ville   du prospect,        chaque lead 0-100    un email unique      réponse/opt-out
  en rotation)    trouve l'email      et filtre            par secteur+hooks
```

1. **Sourcing** — interroge Google Places pour chaque couple *secteur × ville* (8 secteurs × 36 villes, rotation persistante — modifiable dans `src/config.js`).
2. **Enrichissement** — visite le site du prospect (accueil, /contact, /mentions-légales), extrait l'email et un texte de personnalisation. Fallback Hunter.io optionnel.
3. **Qualification IA** — Claude évalue chaque lead (activité pertinente ? entreprise active ? taille joignable ?), attribue un score 0-100, **rejette** sous le seuil et extrait des **accroches concrètes** pour la personnalisation.
4. **Cold email** — Claude rédige un email **unique par prospect** : première phrase ancrée dans LEUR réalité (hooks), argumentaire adapté au **secteur** (detailer ≠ garage ≠ loueur), code promo, 90-130 mots, vouvoiement.
5. **Relances** — J+3 puis J+7 (paramétrable), ton différent à chaque relance, arrêt automatique si réponse / opt-out / bounce.

### Garde-fous intégrés (ne pas désactiver)
- **Quotas** : 20 nouveaux emails + 20 relances / jour par défaut. *Monter progressivement* (semaine 1 : 20, semaine 2 : 35, semaine 3 : 50…) pour préserver la réputation du domaine.
- **Fenêtre d'envoi** : jours ouvrés, 9h-18h Paris, 45s-2min de délai aléatoire entre chaque envoi.
- **Liste de suppression** : tout opt-out ("STOP") ou bounce est définitivement exclu.
- **Mention opt-out RGPD** ajoutée en pied de chaque email (la prospection B2B est légale en France si l'email est professionnel, en lien avec l'activité, avec possibilité d'opposition).

## Installation (10 min)

```bash
cd prospection-ia
npm install
cp .env.example .env
# puis remplis .env :
```

| Clé | Où l'obtenir | Coût |
|---|---|---|
| `ANTHROPIC_API_KEY` | platform.claude.com | ~0,05-0,15 €/lead qualifié+contacté (Opus) |
| `GOOGLE_PLACES_API_KEY` | console.cloud.google.com → activer **Places API (New)** | 200 $/mois offerts ≈ 6 000 recherches |
| `BREVO_API_KEY` | app.brevo.com → SMTP & API | Gratuit jusqu'à 300 emails/jour |
| `HUNTER_API_KEY` *(optionnel)* | hunter.io | 25 recherches/mois gratuites |

⚠️ **Avant le premier envoi** : configure **SPF, DKIM et DMARC** sur ton domaine dans Brevo (Réglages → Expéditeurs & domaines). Sans ça, tes emails finissent en spam. Idéalement, utilise un domaine dédié (ex. `cleantech-pro.fr`) pour protéger le domaine principal.

## Lancement

```bash
npm start          # boucle 24h/24
npm run once       # un seul cycle (pour tester)
npm run report     # état du pipeline
```

### Tourner 24h/24 pour de vrai
Le process doit vivre sur une machine allumée en permanence — un VPS à 5 €/mois suffit (Hetzner, OVH, Scaleway). Avec pm2 :

```bash
npm i -g pm2
pm2 start src/index.js --name prospector
pm2 save && pm2 startup   # relance auto au reboot
pm2 logs prospector       # suivre l'activité
```

## Gestion quotidienne (2 min/jour)

- **Quelqu'un répond ?** 🎉 Stoppe ses relances puis traite la vente à la main :
  ```bash
  npm run mark -- replied contact@garage-dupont.fr
  ```
- **Quelqu'un dit STOP ?** `npm run mark -- optout email@...` (suppression définitive)
- **Email invalide ?** `npm run mark -- bounced email@...`
- **Importer tes propres leads** (salon, annuaire, réseau) :
  ```bash
  npm run import -- mes-leads.csv    # colonnes: name,sector_label,city,email,website,phone
  ```

## Régler la machine

Tout est dans `.env` et `src/config.js` :
- **Secteurs & villes** : tableaux `SECTORS` / `CITIES` dans `src/config.js`
- **Seuil de qualification** : `MIN_QUALIFY_SCORE` (60 par défaut ; monte à 75 pour ne contacter que la crème)
- **Volume** : `MAX_NEW_EMAILS_PER_DAY` / `MAX_FOLLOWUPS_PER_DAY`
- **Coût IA** : `QUALIFY_MODEL=claude-haiku-4-5` divise le coût de qualification par ~5 (garde `COMPOSE_MODEL=claude-opus-4-8` : la qualité de rédaction fait le taux de réponse)
- **Le pitch des emails** : prompts dans `src/llm.js` (`QUALIFY_SYSTEM` / `COMPOSE_SYSTEM`)

## Données

Tout vit dans `prospector.db` (SQLite, dans ce dossier). Statuts d'un lead :

```
NEW → ENRICHED → QUALIFIED → CONTACTED → FOLLOWUP_1 → EXHAUSTED
         │            │
         └ NO_EMAIL   └ REJECTED          + terminaux : REPLIED 🎉, OPTOUT, BOUNCED
```

## Limites connues / v2 possibles

- **Détection des réponses** : manuelle pour l'instant (`npm run mark`). V2 : webhook Brevo (bounces/spam auto) + lecture IMAP de la boîte pour détecter les réponses et même y répondre avec l'IA.
- **Un seul canal** (email). V2 : ajouter un appel automatique de suivi, LinkedIn, SMS.
- **Le sourcing dépend de Google Places** : certains pros n'ont pas de site → pas d'email trouvable → statut `NO_EMAIL` (relançables par téléphone, liste via `npm run report`).
