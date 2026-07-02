# 🤖 CleanTech Prospector — Prospection B2B autonome par IA + Dashboard temps réel

Pipeline qui tourne **en local sur ton PC** pour vendre les produits CleanTech aux pros de l'auto (detailers, lavages, garages, carrossiers, négociants VO, loueurs, flottes VTC). Scraping web, qualification par IA, cold emails personnalisés via **ton Gmail**, relances automatiques — le tout piloté depuis un **dashboard temps réel**.

![pipeline](https://img.shields.io/badge/pipeline-scrape→qualify→email→relance-blue)

## La pipeline, en boucle

```
 SCRAPING ──► ENRICHISSEMENT ──► QUALIFICATION IA ──► COLD EMAIL PERSO ──► RELANCES J+3/J+7
 recherche web    Playwright         Claude score        Claude rédige        auto, stop si
 (ou Google        (anti-bot, JS,     0-100 + accroches   un email unique      réponse/opt-out
  Places)          emails obfusqués)  filtre la qualité   par secteur+hooks
```

1. **Sourcing puissant (multi-sources)** — combine plusieurs bases pour un max de prospects :
   - **OpenStreetMap / Overpass API** (gratuit, sans clé) : base mondiale de commerces géolocalisés (garages, lavages, concessions, loueurs…) avec **site web + téléphone (+ parfois email) directement dans la donnée** — des dizaines à centaines par ville. Quand l'email est déjà fourni, le lead passe direct en `ENRICHED` (scraping économisé).
   - **Google Places** (premium) si tu fournis une clé — meilleure note/avis.
   - **Recherche web** (Playwright/DuckDuckGo, paginé) en fallback pour les secteurs peu couverts (ex. VTC).
2. **Enrichissement (scraper niveau pro)** — un **navigateur furtif Playwright** visite chaque site en profondeur et extrait les emails de **toutes** les sources :
   - **Décodage Cloudflare** (`data-cfemail`) : les emails cachés derrière la protection Cloudflare
   - **Données structurées JSON-LD / schema.org** (`LocalBusiness.email`, `contactPoint`)
   - **Obfuscation** (`nom [at] domaine [dot] fr`, entités HTML, `mailto:`)
   - **Crawl intelligent** : découverte des vrais liens internes (contact, mentions, équipe) + lecture du `sitemap.xml`, rendu **concurrent** de plusieurs pages
   - **Vérification MX (DNS)** : ne garde que les domaines qui **reçoivent réellement des emails** → emails ultra qualifiés, domaines morts/parkés éliminés
   - **Scoring qualité** (même domaine + `contact@`/`direction@`/`devis@` = top ; `rgpd`/`noreply` écartés) + capture du **téléphone** (relance tel) et des **réseaux sociaux**
   - Furtivité renforcée (fingerprint WebGL, anti-`webdriver`) + **blocage images/polices** → 3-4× plus rapide
3. **Qualification IA** — Claude note chaque lead (activité pertinente ? actif ? joignable ?), **rejette** sous le seuil, et extrait des **accroches concrètes** pour la personnalisation.
4. **Cold email** — Claude rédige un email **unique** : 1ère phrase ancrée dans LEUR réalité, argument adapté au **secteur**, code promo, vouvoiement. Envoyé via **ton SMTP Gmail**.
5. **Relances** — J+3 puis J+7, ton différent à chaque fois, arrêt automatique si réponse/opt-out.

## 🖥️ Dashboard temps réel (`http://localhost:4300`)

- **KPIs du jour** : sourcés, emails trouvés, qualifiés, cold emails, relances, réponses
- **Flux de décision en direct** (SSE) : chaque scrape, chaque score IA, chaque envoi apparaît en temps réel
- **Entonnoir pipeline** : où en sont tous tes leads
- **Section Emails envoyés** : chaque email, cliquable pour lire le corps complet
- **Table Leads** : recherche + filtre, boutons ✅ Réponse / 🚫 STOP
- **Boutons** : ⚡ Scraper maintenant · ⏸️ Pause/Reprendre les envois

## Installation (10 min)

```bash
cd prospection-ia
npm install
npx playwright install chromium     # navigateur pour le scraping
cp .env.example .env                 # puis remplis (voir ci-dessous)
npm start                            # lance la boucle + le dashboard
```

Ouvre **http://localhost:4300**.

### Configuration `.env`

| Clé | Comment l'obtenir | Obligatoire ? |
|---|---|---|
| `ANTHROPIC_API_KEY` | platform.claude.com | ✅ |
| `GMAIL_USER` | ton adresse Gmail | ✅ |
| `GMAIL_APP_PASSWORD` | **mot de passe d'application** (voir ci-dessous) | ✅ |
| `GOOGLE_PLACES_API_KEY` | console.cloud.google.com → Places API (New) | ❌ (sinon recherche web) |
| `HUNTER_API_KEY` | hunter.io (25 gratuits/mois) | ❌ |

**🔑 Mot de passe d'application Gmail** (ce n'est PAS ton mot de passe habituel) :
1. myaccount.google.com → **Sécurité** → active la **validation en 2 étapes**
2. → **Mots de passe des applications** → crée-en un → colle-le dans `GMAIL_APP_PASSWORD`

**🧪 Tester sans rien envoyer** : mets `DRY_RUN=1` — la pipeline tourne, compose les vrais emails, tu les vois dans le dashboard, mais **rien n'est envoyé**. Passe à `DRY_RUN=0` quand tu es prêt.

## Faire tourner sur ton PC les premiers jours

Laisse simplement `npm start` ouvert dans un terminal (garde le PC allumé). Le dashboard reste dispo. Regarde les résultats s'accumuler.

- **Gmail limite ~500 emails/jour**, mais commence **bas** : `MAX_NEW_EMAILS_PER_DAY=20` la 1ère semaine (réputation d'envoi). Monte progressivement.
- ⚠️ **Délivrabilité** : configure **SPF/DKIM/DMARC** sur ton domaine si tu envoies depuis une adresse pro. Depuis un `@gmail.com`, c'est déjà signé, mais évite les envois massifs (Gmail te bloquerait).

Quand tu vois que ça convertit → tu passes sur un VPS 24h/24 (`pm2 start src/index.js`).

## Gestion quotidienne (depuis le dashboard)

- Un prospect répond → clique **✅ Réponse** sur sa ligne (stoppe ses relances, à toi de conclure 🤝)
- Quelqu'un dit STOP → **🚫 STOP** (suppression définitive)
- En ligne de commande aussi : `npm run mark -- replied contact@x.fr`
- Importer tes propres leads : `npm run import -- mes-leads.csv` (colonnes `name,sector_label,city,email,website,phone`)

## Réglages (`.env` et `src/config.js`)

- **Secteurs & villes** : tableaux `SECTORS` / `CITIES` dans `src/config.js`
- **Sévérité IA** : `MIN_QUALIFY_SCORE` (60 → 75 pour ne garder que la crème)
- **Volume** : `MAX_NEW_EMAILS_PER_DAY` / `MAX_FOLLOWUPS_PER_DAY`
- **Coût IA** : `QUALIFY_MODEL=claude-haiku-4-5` (÷5 sur la qualif ; garde Opus pour la rédaction)
- **Le pitch** : prompts dans `src/llm.js`

## Statuts d'un lead

```
NEW → ENRICHED → QUALIFIED → CONTACTED → FOLLOWUP_1 → EXHAUSTED
         │            │
         └ NO_EMAIL   └ REJECTED     + terminaux : REPLIED 🎉, OPTOUT, BOUNCED
```

## Notes légales & limites

- **Prospection B2B** : légale en France si l'email est **professionnel**, en lien avec l'activité, avec **droit d'opposition** — le pied opt-out RGPD est ajouté à chaque email, et tout "STOP" est exclu définitivement.
- **Scraping** : ne collecte que des **coordonnées professionnelles publiques**. Reste raisonnable sur le volume et respecte les CGU des sites.
- **Détection des réponses** : manuelle pour l'instant (bouton dashboard). V2 possible : webhook + lecture IMAP de ta boîte pour auto-marquer les réponses (et y répondre à l'IA).
