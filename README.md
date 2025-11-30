# 🚗 RDV SaaS App – Local Dev

Application SaaS complète pour la gestion de rendez-vous de lavage auto avec interface Admin/Closeur et Client.

## 📋 Prérequis

- **Node.js** 18+ 
- **Docker** et Docker Compose
- **NPM** ou Yarn

## 🔥 Installation Rapide

### 1. Lancer la base MongoDB

```bash
docker-compose up -d
```

Cela démarre :
- **MongoDB** sur le port `27017`
- **Mongo Express** sur `http://localhost:8081` (admin/admin)

### 2. Configuration Backend

```bash
cd server
cp env.example .env
```

Éditez `server/.env` et configurez :

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/rdv-app
TEXTBELT_API_KEY=votre_cle_textbelt
JWT_SECRET=votre_secret_jwt
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Installer les dépendances Backend

```bash
cd server
npm install
```

### 4. Initialiser les données de test

```bash
cd server
npm run seed
```

Cela créera :
- Un admin : `admin@leadclean.com` / `admin123`
- Un closeur : `closeur@leadclean.com` / `closeur123`
- Un centre : "Lavage Pro Marseille"
- 2 prestations
- Un calendrier avec créneaux

### 5. Installer les dépendances Frontend

```bash
cd client
npm install
```

### 6. Démarrer le Backend

```bash
cd server
npm run dev
```

Le backend sera accessible sur `http://localhost:5000`

### 7. Démarrer le Frontend

```bash
cd client
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## 🚀 Commandes Rapides

### Depuis la racine du projet

```bash
# Démarrer MongoDB
docker-compose up -d

# Arrêter MongoDB
docker-compose down

# Réinitialiser les données
cd server && npm run seed
```

### Scripts disponibles

**Backend (`server/`)** :
- `npm run dev` - Démarrer en mode développement (nodemon)
- `npm start` - Démarrer en mode production
- `npm run seed` - Initialiser les données de test

**Frontend (`client/`)** :
- `npm run dev` - Démarrer le serveur de développement
- `npm run build` - Build de production
- `npm run preview` - Prévisualiser le build

## 🧪 Accès et Tests

### URLs principales

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:5000
- **Mongo Express** : http://localhost:8081 (admin/admin)

### Identifiants de test

**Admin** :
- Email : `admin@leadclean.com`
- Password : `admin123`

**Closeur** :
- Email : `closeur@leadclean.com`
- Password : `closeur123`

### Routes principales

**Admin** :
- `/admin/login` - Connexion
- `/admin/dashboard` - Liste des centres
- `/admin/centres/:id` - Gestion d'un centre
- `/admin/rdv/:id` - Upload photos

**Client** :
- `/booking/:centreId` - Prise de rendez-vous
- `/rdv/:id/confirmation` - Confirmation de réservation
- `/rdv/:id/photos` - Consultation des photos (bloqué par avis Google)

## 📁 Structure du Projet

```
rdv-saas-app/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   │   ├── admin/      # Pages admin
│   │   │   └── client/     # Pages client
│   │   ├── services/       # Services API
│   │   └── utils/          # Utilitaires
│   └── package.json
├── server/                 # Backend Express
│   ├── models/            # Modèles MongoDB
│   ├── routes/            # Routes API
│   ├── middleware/        # Middlewares
│   ├── utils/             # Utilitaires
│   ├── scripts/           # Scripts (seed)
│   ├── uploads/           # Photos uploadées
│   └── package.json
├── docker-compose.yml     # MongoDB + Mongo Express
├── README.md
└── package.json           # Monorepo root
```

## 🔧 Configuration

### Variables d'environnement

**Backend** (`server/.env`) :
- `PORT` - Port du serveur (défaut: 5000)
- `MONGO_URI` - URI de connexion MongoDB
- `TEXTBELT_API_KEY` - Clé API TextBelt pour SMS
- `JWT_SECRET` - Secret pour signer les tokens JWT
- `JWT_EXPIRE` - Durée de validité des tokens (défaut: 7d)
- `FRONTEND_URL` - URL du frontend pour CORS

### TextBelt API

1. Obtenez votre clé API sur [textbelt.com](https://textbelt.com)
2. Ajoutez-la dans `server/.env` : `TEXTBELT_API_KEY=votre_cle`
3. **Note** : Version gratuite limitée à 1 SMS/jour en test

## 📸 Stockage des Photos

Les photos sont stockées localement dans `server/uploads/`.

**Pour la production**, utilisez un service de stockage cloud :
- AWS S3
- Firebase Storage
- Cloudinary

## 🐛 Dépannage

### MongoDB ne démarre pas

```bash
docker-compose down
docker-compose up -d
```

### Erreur de connexion MongoDB

Vérifiez que MongoDB est bien démarré :
```bash
docker ps
```

### Port déjà utilisé

Modifiez les ports dans :
- `docker-compose.yml` pour MongoDB
- `server/.env` pour le backend
- `client/vite.config.js` pour le frontend

### Photos ne s'affichent pas

Vérifiez que le dossier `server/uploads` existe :
```bash
mkdir -p server/uploads
```

### Erreur "Module not found"

Réinstallez les dépendances :
```bash
cd server && npm install
cd ../client && npm install
```

## 🔄 Workflow Complet

1. **Admin crée un centre** → `/admin/dashboard`
2. **Admin ajoute des prestations** → `/admin/centres/:id`
3. **Admin gère le calendrier** → Ajoute des créneaux disponibles
4. **Client réserve** → `/booking/:centreId`
   - Sélectionne prestation
   - Choisit date/heure
   - Remplit formulaire
   - Reçoit SMS de confirmation
5. **Admin valide le RDV** → Change statut à "Confirmé"
6. **Service effectué** → Admin change statut à "Terminé"
   - SMS automatique envoyé au client avec lien photos
7. **Admin upload photos** → `/admin/rdv/:id`
8. **Client laisse avis Google** → Débloque l'accès aux photos
9. **Client accède aux photos** → `/rdv/:id/photos?token=...`

## 📝 Notes Importantes

- Les photos sont stockées localement dans `server/uploads/`
- Pour la production, changez `JWT_SECRET` par une valeur sécurisée
- Les SMS TextBelt sont limités (voir leur documentation)
- Le dossier `uploads/` doit être créé manuellement si nécessaire

## 🎯 Prochaines Améliorations

- [ ] Gestion avancée du calendrier (jours fériés, horaires variables)
- [ ] Notifications email en plus des SMS
- [ ] Dashboard avec statistiques
- [ ] Export des données
- [ ] Multi-utilisateurs avec rôles avancés
- [ ] Intégration paiement en ligne
- [ ] Application mobile

## 📄 Licence

Projet privé - Tous droits réservés

---

**Développé avec ❤️ pour LeadClean**
