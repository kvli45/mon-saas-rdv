# 🔧 Dépannage SMS TextBelt

## ❌ Erreurs courantes et solutions

### 1. "Erreur lors de l'envoi du SMS"

**Causes possibles :**

#### A. Format du numéro de téléphone
- **Problème** : TextBelt nécessite un format international avec le préfixe `+`
- **Solution** : Le système formate automatiquement les numéros français
  - `0612345678` → `+33612345678`
  - `+33612345678` → OK
  - `33612345678` → `+33612345678`

#### B. Quota TextBelt dépassé
- **Problème** : Version gratuite limitée à **1 SMS/jour**
- **Solution** : 
  - Attendre 24h entre chaque SMS
  - Ou passer à un plan payant sur textbelt.com

#### C. Numéro invalide
- **Problème** : Le numéro n'existe pas ou n'est pas valide
- **Solution** : Vérifier que le numéro est correct dans les informations du RDV

#### D. Clé API invalide
- **Problème** : La clé API TextBelt n'est pas valide ou expirée
- **Solution** : Vérifier la clé dans `server/.env`

### 2. "API key manquante"

**Solution :**
1. Vérifier que `TEXTBELT_API_KEY` est dans `server/.env`
2. Redémarrer le serveur après modification du `.env`

### 3. Message trop long

**Solution :**
- Le message est maintenant optimisé à ~120 caractères
- Le lien est inclus directement dans le SMS

## 🔍 Vérifications

### Vérifier les logs serveur

```bash
# Voir les logs en temps réel
tail -f /tmp/server.log

# Ou dans la console du serveur Node.js
```

### Tester manuellement

```bash
# Tester avec curl
curl -X POST http://localhost:3001/api/rdv/send-after-service/[RDV_ID] \
  -H "Authorization: Bearer [VOTRE_TOKEN]" \
  -H "Content-Type: application/json"
```

## 📝 Format du numéro de téléphone

Le système formate automatiquement :
- ✅ `+33612345678` → OK
- ✅ `0612345678` → Converti en `+33612345678`
- ✅ `33612345678` → Converti en `+33612345678`
- ❌ `12345678` → Peut échouer (format non reconnu)

## 💡 Conseils

1. **Tester avec votre propre numéro** d'abord
2. **Vérifier les logs** pour voir l'erreur exacte
3. **Respecter le quota** TextBelt (1 SMS/jour en gratuit)
4. **Vérifier le format** du numéro dans les données du RDV

## 🔗 Liens utiles

- TextBelt Dashboard : https://textbelt.com/
- Documentation TextBelt : https://textbelt.com/faq

