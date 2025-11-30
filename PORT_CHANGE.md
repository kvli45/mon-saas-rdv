# ⚠️ Changement de Port

Le port **5000** était utilisé par Apple AirPlay sur votre Mac.

**Le serveur backend utilise maintenant le port 3001** au lieu de 5000.

## ✅ Modifications effectuées

- `server/.env` : PORT=3001
- `server/server.js` : Port par défaut = 3001
- `client/src/services/api.js` : URL API = http://localhost:3001/api
- `client/src/pages/client/RDVPhotos.jsx` : Port 3001
- `client/src/pages/admin/RDVPhotos.jsx` : Port 3001

## 🎯 URLs mises à jour

- **Backend API** : http://localhost:3001
- **Frontend** : http://localhost:5173 (inchangé)

## ✅ Test de connexion réussi

La connexion avec les identifiants fonctionne maintenant :
- Email : `admin@leadclean.com`
- Password : `admin123`

Vous pouvez maintenant vous connecter sur http://localhost:5173/admin/login

