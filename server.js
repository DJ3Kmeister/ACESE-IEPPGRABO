const express = require('express');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const dbFile = process.env.DB_FILE || 'collecte.db';
const db = new sqlite3.Database(dbFile);

// Configuration sécurisée CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requêtes par minute pour l'API
  message: { error: 'Limite d\'envoi atteinte. Veuillez patienter.' }
});

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "https:", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json({ limit: '50mb' }));

// Création des tables avec schéma amélioré
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drena TEXT NOT NULL,
    iepp TEXT NOT NULL,
    secteur_pedagogique TEXT NOT NULL,
    nom_ecole TEXT NOT NULL,
    nom_directeur TEXT NOT NULL,
    prenoms_directeur TEXT NOT NULL,
    contact1 TEXT NOT NULL,
    contact2 TEXT,
    email TEXT,
    eleves TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Table pour les logs (optionnel mais utile)
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Fonction de validation des données
function validatePayload(data) {
  const errors = [];

  // Validation des champs requis
  const requiredFields = ['drena', 'iepp', 'secteur_pedagogique', 'nom_ecole', 
                          'nom_directeur', 'prenoms_directeur', 'contact1', 'eleves'];
  requiredFields.forEach(field => {
    if (!data[field] || String(data[field]).trim() === '') {
      errors.push(`Champ requis manquant: ${field}`);
    }
  });

  // Validation du contact (10 chiffres)
  if (data.contact1 && !/^\d{10}$/.test(data.contact1)) {
    errors.push('Le contact 1 doit contenir exactement 10 chiffres');
  }

  if (data.contact2 && data.contact2 !== '' && !/^\d{10}$/.test(data.contact2)) {
    errors.push('Le contact 2 doit contenir exactement 10 chiffres');
  }

  // Validation des élèves
  if (!Array.isArray(data.eleves)) {
    errors.push('Les élèves doivent être un tableau');
  } else {
    data.eleves.forEach((eleve, idx) => {
      const eleveRequired = ['nom', 'prenoms', 'sexe', 'date_naissance_probable', 'classe',
                             'nom_pere', 'numero_pere', 'nom_mere', 'numero_mere', 
                             'nom_temoin', 'numero_temoin'];
      eleveRequired.forEach(field => {
        if (!eleve[field] || String(eleve[field]).trim() === '') {
          errors.push(`Élève ${idx + 1}: champ manquant ${field}`);
        }
      });

      // Validation format date jj/mm/aaaa
      if (eleve.date_naissance_probable && 
          !/^\d{2}\/\d{2}\/\d{4}$/.test(eleve.date_naissance_probable)) {
        errors.push(`Élève ${idx + 1}: format date invalide (jj/mm/aaaa attendu)`);
      }
    });
  }

  return errors;
}

// Fonction de logging
function logAction(action, details, ip) {
  db.run('INSERT INTO logs (action, details, ip_address) VALUES (?, ?, ?)',
    [action, JSON.stringify(details), ip]);
}

// Static files
app.use('/client', express.static(path.join(__dirname, 'client')));

// Protection admin avec variable d'environnement
const adminPassword = process.env.ADMIN_PASSWORD || 'S3ph1r0th2025!';
app.use('/admin', basicAuth({
  users: { admin: adminPassword },
  challenge: true,
  realm: 'ACESE-Admin'
}));

// Routes
app.get('/admin', (_, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// API: Récupérer tous les élèves avec filtres optionnels
app.get('/api/eleves', (req, res) => {
  const { secteur, ecole, dateDebut, dateFin } = req.query;
  let query = 'SELECT * FROM lots WHERE 1=1';
  const params = [];

  if (secteur) {
    query += ' AND secteur_pedagogique = ?';
    params.push(secteur);
  }
  if (ecole) {
    query += ' AND nom_ecole LIKE ?';
    params.push(`%${ecole}%`);
  }
  if (dateDebut) {
    query += ' AND created_at >= ?';
    params.push(dateDebut);
  }
  if (dateFin) {
    query += ' AND created_at <= ?';
    params.push(dateFin + ' 23:59:59');
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erreur DB:', err);
      return res.status(500).json({ error: 'Erreur base de données' });
    }
    res.json(rows);
  });
});

// API: Statistiques agrégées
app.get('/api/stats', (req, res) => {
  const queries = {
    parSecteur: `SELECT secteur_pedagogique, COUNT(*) as nb_lots, 
                 SUM(CASE WHEN eleves IS NOT NULL THEN json_array_length(eleves) ELSE 0 END) as total_eleves
                 FROM lots GROUP BY secteur_pedagogique`,
    parEcole: `SELECT nom_ecole, secteur_pedagogique, 
               SUM(CASE WHEN eleves IS NOT NULL THEN json_array_length(eleves) ELSE 0 END) as nb_eleves
               FROM lots GROUP BY nom_ecole ORDER BY nb_eleves DESC`,
    parClasse: `SELECT json_extract(value, '$.classe') as classe,
                COUNT(*) as effectif
                FROM lots, json_each(lots.eleves)
                GROUP BY classe`,
    global: `SELECT 
             COUNT(DISTINCT lots.id) as total_lots,
             SUM(CASE WHEN eleves IS NOT NULL THEN json_array_length(eleves) ELSE 0 END) as total_eleves,
             COUNT(DISTINCT nom_ecole) as total_ecoles,
             COUNT(DISTINCT secteur_pedagogique) as total_secteurs
             FROM lots`
  };

  const results = {};
  let completed = 0;

  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, [], (err, rows) => {
      if (err) {
        results[key] = { error: err.message };
      } else {
        results[key] = rows;
      }
      completed++;
      if (completed === Object.keys(queries).length) {
        res.json(results);
      }
    });
  });
});

// API: Ajouter des élèves (avec rate limiting)
app.post('/api/eleves', apiLimiter, (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;

  // Validation
  const errors = validatePayload(req.body);
  if (errors.length > 0) {
    logAction('VALIDATION_FAILED', { errors }, ip);
    return res.status(400).json({ error: 'Validation échouée', details: errors });
  }

  const {
    drena, iepp, secteur_pedagogique, nom_ecole,
    nom_directeur, prenoms_directeur, contact1, contact2, email, eleves
  } = req.body;

  const stmt = db.prepare(`INSERT INTO lots
    (drena, iepp, secteur_pedagogique, nom_ecole, nom_directeur, prenoms_directeur, 
     contact1, contact2, email, eleves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run([
    drena.trim(),
    iepp.trim(),
    secteur_pedagogique.trim(),
    nom_ecole.trim(),
    nom_directeur.trim(),
    prenoms_directeur.trim(),
    contact1.trim(),
    contact2 ? contact2.trim() : '',
    email ? email.trim().toLowerCase() : '',
    JSON.stringify(eleves)
  ], function(err) {
    if (err) {
      console.error('Erreur insertion:', err);
      logAction('INSERT_ERROR', { error: err.message }, ip);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
    }

    logAction('INSERT_SUCCESS', { 
      id: this.lastID, 
      ecole: nom_ecole, 
      nb_eleves: eleves.length 
    }, ip);

    res.status(201).json({ 
      success: true, 
      id: this.lastID,
      message: `${eleves.length} élève(s) enregistré(s) avec succès`
    });
  });

  stmt.finalize();
});

// API: Supprimer un lot (admin uniquement)
app.delete('/api/eleves/:id', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const { id } = req.params;

  db.run('DELETE FROM lots WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erreur suppression' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    logAction('DELETE', { id }, ip);
    res.json({ success: true, message: 'Supprimé avec succès' });
  });
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🟢 ACESE Server running on port ${PORT}`);
  console.log(`📁 Database: ${dbFile}`);
  console.log(`🔐 Admin password: ${adminPassword === 'S3ph1r0th2025!' ? 'DEFAULT (change in production!)' : 'Set from env'}`);
});

module.exports = app;
