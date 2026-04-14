# ACESE – IEPP GRABO v2.0

Application de Collecte des Élèves Sans Extraits pour l'IEPP GRABO, DRENA San-Pédro, Côte d'Ivoire.

## 📁 Structure du projet

```
├── server.js              # Backend Express sécurisé
├── package.json           # Dépendances Node.js
├── admin.html             # Dashboard administrateur
├── telecharger-client.html # Page de téléchargement client
├── client/
│   └── index.html         # Application client (formulaire de saisie)
└── collecte.db            # Base de données SQLite (créée automatiquement)
```

## 🚀 Installation

### Prérequis
- Node.js 18+ installé

### Étapes

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement (optionnel mais recommandé)**
   ```bash
   # Linux/Mac
   export ADMIN_PASSWORD="votre_mot_de_passe_securise"
   export PORT=3000

   # Windows
   set ADMIN_PASSWORD=votre_mot_de_passe_securise
   set PORT=3000
   ```

3. **Démarrer le serveur**
   ```bash
   npm start
   # ou pour le développement
   npm run dev
   ```

4. **Accéder à l'application**
   - Dashboard admin: http://localhost:3000/admin
   - Téléchargement client: http://localhost:3000/client
   - API: http://localhost:3000/api/eleves

## 🔐 Sécurité

### Variables d'environnement importantes

| Variable | Description | Défaut |
|----------|-------------|--------|
| `ADMIN_PASSWORD` | Mot de passe dashboard | S3ph1r0th2025! |
| `PORT` | Port du serveur | 3000 |
| `DB_FILE` | Chemin base de données | collecte.db |
| `ALLOWED_ORIGINS` | Origines CORS autorisées | * (toutes) |

### Bonnes pratiques en production

1. **Changer le mot de passe admin par défaut**
2. **Définir ALLOWED_ORIGINS** pour limiter les requêtes CORS
3. **Utiliser HTTPS** (via reverse proxy Nginx/Apache)
4. **Sauvegarder régulièrement** la base SQLite

## ✨ Nouveautés version 2.0

### Backend
- ✅ Rate limiting (protection contre spam)
- ✅ Helmet.js (headers de sécurité)
- ✅ Validation complète des données
- ✅ Logging des actions
- ✅ API de statistiques (`/api/stats`)
- ✅ Filtres sur les données (`/api/eleves?secteur=...`)
- ✅ Suppression de lots

### Dashboard Admin
- ✅ Export Excel (SheetJS)
- ✅ Filtres dynamiques (secteur, école, date)
- ✅ Statistiques visuelles avancées
- ✅ Cartes de synthèse
- ✅ Tableau détaillé par école
- ✅ Notifications toast (plus d'alertes)
- ✅ Indicateur de chargement

### Client
- ✅ Indicateur de connexion (online/offline)
- ✅ Recherche d'élèves dans le tableau
- ✅ Confirmation avant suppression
- ✅ Stats en temps réel (garçons/filles/total)
- ✅ Toast notifications
- ✅ Modal de confirmation
- ✅ UI/UX améliorée (responsive)

## 📊 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/eleves` | Liste avec filtres optionnels |
| POST | `/api/eleves` | Ajouter un lot d'élèves |
| DELETE | `/api/eleves/:id` | Supprimer un lot |
| GET | `/api/stats` | Statistiques agrégées |
| GET | `/health` | Health check |

### Paramètres de filtre (GET /api/eleves)
- `secteur`: Filtrer par secteur pédagogique
- `ecole`: Recherche par nom d'école (LIKE)
- `dateDebut`: Date début (YYYY-MM-DD)
- `dateFin`: Date fin (YYYY-MM-DD)

## 🛠️ Développement

```bash
# Mode développement avec auto-reload
npm run dev

# Tests (si configurés)
npm test
```

## 📱 Utilisation client (offline)

1. Le directeur télécharge `index.html` sur son téléphone
2. Il ouvre le fichier dans son navigateur
3. Il remplit la configuration de son école
4. Il saisit les élèves sans extrait (données stockées localement)
5. Quand il a du réseau, il clique "Envoyer sur le serveur"

## 🔄 Déploiement sur Render.com

1. Créer un nouveau Web Service
2. Connecter le repo GitHub
3. Définir les variables d'environnement dans l'interface Render
4. Build command: `npm install`
5. Start command: `npm start`

## 📝 License

Propriété de l'IEPP GRABO. Développé par DJ3K S3PH1R0TH.

---
**Version:** 2.0.0  
**Date:** 2025  
**Contact:** IEPP GRABO, DRENA San-Pédro
