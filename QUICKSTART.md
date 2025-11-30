tien# 🚀 Quick Start Guide

Guide rapide pour démarrer l'application en local.

## ⚡ Démarrage Ultra-Rapide

```bash
# 1. Installer toutes les dépendances
npm run install:all

# 2. Configurer l'environnement
cd server
cp env.example .env
# Éditer .env et ajouter votre TEXTBELT_API_KEY

# 3. Démarrer MongoDB
npm run docker:up

# 4. Initialiser les données
npm run seed

# 5. Démarrer l'application (2 terminaux)
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
cd client && npm run dev
```

## 🎯 Accès Rapide

- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:5000
- **Mongo Express** : http://localhost:8081 (admin/admin)

## 🔑 Identifiants de Test

**Admin** :
- Email : `admin@leadclean.com`
- Password : `admin123`

**Closeur** :
- Email : `closeur@leadclean.com`
- Password : `closeur123`

## 📝 Checklist de Démarrage

- [ ] Docker installé et lancé
- [ ] MongoDB démarré (`docker ps` doit montrer les containers)
- [ ] Fichier `server/.env` créé avec TEXTBELT_API_KEY
- [ ] Dépendances installées (`npm run install:all`)
- [ ] Données seedées (`npm run seed`)
- [ ] Backend démarré sur port 5000
- [ ] Frontend démarré sur port 5173

## 🧪 Test Rapide

1. Aller sur http://localhost:5173/admin/login
2. Se connecter avec `admin@leadclean.com` / `admin123`
3. Créer un centre ou utiliser celui existant
4. Aller sur `/booking/:centreId` pour tester la réservation client

## 🐛 Problèmes Courants

**MongoDB ne démarre pas** :
```bash
docker-compose down && docker-compose up -d
```

**Port 5000 ou 5173 déjà utilisé** :
- Modifier le port dans `server/.env` ou `client/vite.config.js`

**Erreur "Cannot find module"** :
```bash
cd server && npm install
cd ../client && npm install
```

---

**Prêt à coder ! 🚀**
