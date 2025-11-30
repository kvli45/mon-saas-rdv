# 🚀 Démarrage Rapide

## ⚠️ MongoDB doit être démarré

Avant de lancer l'application, vous devez démarrer MongoDB :

### Option 1 : Avec Docker (recommandé)

```bash
docker-compose up -d
```

### Option 2 : MongoDB installé localement

Si MongoDB est installé sur votre machine :

```bash
# Sur macOS avec Homebrew
brew services start mongodb-community

# Ou manuellement
mongod --dbpath /usr/local/var/mongodb
```

## ✅ Configuration effectuée

✅ Fichier `.env` créé avec votre clé TextBelt  
✅ Dépendances installées  
✅ Backend et Frontend prêts à démarrer

## 🎯 Prochaines étapes

1. **Démarrer MongoDB** (voir ci-dessus)

2. **Initialiser les données** :
```bash
cd server
npm run seed
```

3. **Démarrer le Backend** (Terminal 1) :
```bash
cd server
npm run dev
```

4. **Démarrer le Frontend** (Terminal 2) :
```bash
cd client
npm run dev
```

## 🔗 Accès

- **Frontend** : http://localhost:5173
- **Backend** : http://localhost:5000
- **Mongo Express** : http://localhost:8081 (si Docker)

## 🔑 Identifiants

- Admin : `admin@leadclean.com` / `admin123`
- Closeur : `closeur@leadclean.com` / `closeur123`

