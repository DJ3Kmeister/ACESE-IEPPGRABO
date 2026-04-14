#!/bin/bash
# Script de nettoyage pour Render
# À exécuter si les vulnérabilités persistent

echo "🧹 Nettoyage du cache npm..."
rm -rf node_modules
rm -f package-lock.json
rm -rf .npm

echo "📦 Réinstallation des dépendances..."
npm install

echo "🔍 Vérification des vulnérabilités..."
npm audit

echo "✅ Terminé !"
