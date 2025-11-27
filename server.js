const express = require('express');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const dbFile = 'collecte.db';
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drena TEXT, iepp TEXT, secteur_pedagogique TEXT, nom_ecole TEXT,
    nom_directeur TEXT, prenoms_directeur TEXT, contact1 TEXT, contact2 TEXT, email TEXT,
    eleves TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/client', express.static(path.join(__dirname, 'client')));

// Protection admin
app.use('/admin', basicAuth({
  users: { admin: 'S3ph1r0th2025!' },
  challenge: true,
  realm: 'ACESE-Admin'
}));

// Routes
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/eleves', (_, res) => {
  db.all('SELECT * FROM lots ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post('/api/eleves', (req, res) => {
  const {
    drena, iepp, secteur_pedagogique, nom_ecole,
    nom_directeur, prenoms_directeur, contact1, contact2, email, eleves
  } = req.body;
  const stmt = db.prepare(`INSERT INTO lots
    (drena, iepp, secteur_pedagogique, nom_ecole, nom_directeur, prenoms_directeur, contact1, contact2, email, eleves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run([
    drena, iepp, secteur_pedagogique, nom_ecole,
    nom_directeur, prenoms_directeur, contact1, contact2 || '', email || '',
    JSON.stringify(eleves)
  ], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(200);
  });
  stmt.finalize();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 ACESE classique sur ${PORT}`));
