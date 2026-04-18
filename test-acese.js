#!/usr/bin/env node
/**
 * Script de test ACESE - Vérification complète du flux de données
 * À exécuter sur le serveur ou en local
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_RESULTS = [];

function log(test, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${status} ${details}`);
  TEST_RESULTS.push({ test, status, details, time: new Date().toISOString() });
}

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: new URL(BASE_URL).port || 80,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(JSON.stringify(data)) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 TEST ACESE - Flux de données complet');
  console.log('========================================');
  console.log(`URL testée: ${BASE_URL}\n`);

  // Test 1: Health check
  try {
    const health = await makeRequest('GET', '/health');
    if (health.status === 200 && health.body.status === 'OK') {
      log('Health Check', 'PASS', 'Serveur en ligne');
    } else {
      log('Health Check', 'FAIL', `Status: ${health.status}`);
    }
  } catch (e) {
    log('Health Check', 'FAIL', e.message);
    console.log('\n🚨 Serveur inaccessible - Arrêt des tests');
    return;
  }

  // Test 2: Vérifier base de données
  const dbPath = path.join(__dirname, 'collecte.db');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    log('Base de données', 'PASS', `Fichier présent (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    log('Base de données', 'WARN', 'Fichier non trouvé (sera créé au premier envoi)');
  }

  // Test 3: Envoi de données (simulation directeur)
  const testData = {
    drena: "DRENA SAN-PEDRO",
    iepp: "IEPP GRABO",
    secteur_pedagogique: "SECTEUR GRABO-EST",
    nom_ecole: "EPP 1A DE GRABO",
    nom_directeur: "KOUASSI",
    prenoms_directeur: "Jean Marie",
    contact1: "0123456789",
    contact2: "",
    email: "test@ecole.ci",
    eleves: [
      {
        nom: "KOUAME",
        prenoms: "Aya Grace",
        sexe: "F",
        date_naissance_probable: "15/03/2015",
        classe: "CP2",
        nom_pere: "KOUAME Paul",
        numero_pere: "0123456789",
        nationalite_pere: "Ivoirienne",
        nom_mere: "KOUAME Amélie",
        numero_mere: "0987654321",
        nationalite_mere: "Ivoirienne",
        nom_temoin: "BLÉ Koffi",
        numero_temoin: "0147258369"
      }
    ]
  };

  try {
    const postResult = await makeRequest('POST', '/api/eleves', testData);
    if (postResult.status === 201 && postResult.body.success) {
      log('Envoi données', 'PASS', `${postResult.body.message} (ID: ${postResult.body.id})`);
    } else if (postResult.status === 429) {
      log('Envoi données', 'WARN', 'Rate limiting actif - trop de requêtes');
    } else {
      log('Envoi données', 'FAIL', `Status: ${postResult.status}, Body: ${JSON.stringify(postResult.body)}`);
    }
  } catch (e) {
    log('Envoi données', 'FAIL', e.message);
  }

  // Test 4: Vérifier récupération des données
  try {
    const getResult = await makeRequest('GET', '/api/eleves');
    if (getResult.status === 200 && Array.isArray(getResult.body)) {
      const count = getResult.body.length;
      log('Récupération données', 'PASS', `${count} lot(s) trouvé(s)`);

      if (count > 0) {
        const lastEntry = getResult.body[0];
        log('Structure données', 'PASS', 
          `École: ${lastEntry.nom_ecole}, Élèves: ${JSON.parse(lastEntry.eleves || '[]').length}`);
      }
    } else {
      log('Récupération données', 'FAIL', `Status: ${getResult.status}`);
    }
  } catch (e) {
    log('Récupération données', 'FAIL', e.message);
  }

  // Test 5: Vérifier stats
  try {
    const statsResult = await makeRequest('GET', '/api/stats');
    if (statsResult.status === 200 && statsResult.body.global) {
      const global = statsResult.body.global[0] || {};
      log('Statistiques', 'PASS', 
        `${global.total_eleves || 0} élèves, ${global.total_ecoles || 0} écoles`);
    } else {
      log('Statistiques', 'FAIL', `Status: ${statsResult.status}`);
    }
  } catch (e) {
    log('Statistiques', 'FAIL', e.message);
  }

  // Test 6: Vérifier dashboard admin accessible
  try {
    const adminResult = await makeRequest('GET', '/admin');
    if (adminResult.status === 401) {
      log('Dashboard admin', 'PASS', 'Protégé par mot de passe (401 attendu)');
    } else if (adminResult.status === 200) {
      log('Dashboard admin', 'PASS', 'Accessible (déjà authentifié?)');
    } else {
      log('Dashboard admin', 'FAIL', `Status: ${adminResult.status}`);
    }
  } catch (e) {
    log('Dashboard admin', 'FAIL', e.message);
  }

  // Résumé
  console.log('\n========================================');
  console.log('📊 RÉSULTATS DES TESTS');
  console.log('========================================');

  const passed = TEST_RESULTS.filter(r => r.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
  const warnings = TEST_RESULTS.filter(r => r.status === 'WARN').length;

  console.log(`✅ Passés: ${passed}`);
  console.log(`❌ Échoués: ${failed}`);
  console.log(`⚠️  Avertissements: ${warnings}`);

  if (failed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS - Le système fonctionne correctement !');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ - Vérifiez les logs ci-dessus');
  }

  // Sauvegarder rapport
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log(`\n📝 Rapport sauvegardé: ${reportPath}`);
}

runTests().catch(console.error);
