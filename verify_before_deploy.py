#!/usr/bin/env python3
"""
Script de vérification bac à sable pour ACESE
À exécuter avant chaque déploiement
"""

import subprocess
import os
import json
import sys

def verify_file(filepath, file_type):
    """Vérifier un fichier selon son type"""

    print(f"\n🔬 VÉRIFICATION: {os.path.basename(filepath)}")
    print("="*60)

    if not os.path.exists(filepath):
        print(f"❌ FICHIER MANQUANT: {filepath}")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    checks_passed = 0
    total_checks = 0

    # Vérifications communes
    total_checks += 1
    if len(content) > 0:
        print("✅ Fichier non vide")
        checks_passed += 1
    else:
        print("❌ Fichier vide")

    total_checks += 1
    if content.count('{') == content.count('}'):
        print(f"✅ Accolades équilibrées ({content.count('{')} paires)")
        checks_passed += 1
    else:
        print(f"❌ Accolades déséquilibrées: {content.count('{')} vs {content.count('}')}")

    total_checks += 1
    if content.count('(') == content.count(')'):
        print(f"✅ Parenthèses équilibrées ({content.count('(')} paires)")
        checks_passed += 1
    else:
        print(f"❌ Parenthèses déséquilibrées: {content.count('(')} vs {content.count(')')}")

    # Vérifications spécifiques par type
    if file_type == 'server_js':
        total_checks += 1
        result = subprocess.run(['node', '--check', filepath], 
                               capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Syntaxe JavaScript valide")
            checks_passed += 1
        else:
            print(f"❌ ERREUR SYNTAXE: {result.stderr[:200]}")

        # Vérifier routes essentielles
        required_routes = [
            "app.get('/admin'", "app.get('/telecharger'", 
            "app.get('/api/eleves'", "app.post('/api/eleves'",
            "app.get('/api/stats'", "app.delete('/api/eleves/:id'",
            "app.get('/health'", "app.listen(PORT"
        ]
        total_checks += 1
        missing = [r for r in required_routes if r not in content]
        if not missing:
            print(f"✅ Routes essentielles présentes ({len(required_routes)} vérifiées)")
            checks_passed += 1
        else:
            print(f"❌ Routes manquantes: {missing}")

        # Vérifier ordre routes vs static
        total_checks += 1
        admin_pos = content.find("app.get('/admin'")
        static_pos = content.find("app.use(express.static")
        if admin_pos != -1 and static_pos != -1 and admin_pos < static_pos:
            print("✅ Ordre correct (routes avant static)")
            checks_passed += 1
        else:
            print("❌ Ordre incorrect ou routes/static manquants")

    elif file_type == 'html':
        total_checks += 1
        if '<!doctype html>' in content.lower() or '<!DOCTYPE html>' in content:
            print("✅ Doctype HTML présent")
            checks_passed += 1
        else:
            print("❌ Doctype HTML manquant")

        total_checks += 1
        if '<html' in content and '</html>' in content:
            print("✅ Balises HTML complètes")
            checks_passed += 1
        else:
            print("❌ Balises HTML incomplètes")

        total_checks += 1
        if '<head>' in content and '</head>' in content:
            print("✅ Section HEAD complète")
            checks_passed += 1
        else:
            print("❌ Section HEAD incomplète")

        total_checks += 1
        if '<body>' in content and '</body>' in content:
            print("✅ Section BODY complète")
            checks_passed += 1
        else:
            print("❌ Section BODY incomplète")

    elif file_type == 'json':
        total_checks += 1
        try:
            json.loads(content)
            print("✅ JSON valide")
            checks_passed += 1
        except json.JSONDecodeError as e:
            print(f"❌ JSON invalide: {e}")

    print("="*60)
    print(f"📊 RÉSULTAT: {checks_passed}/{total_checks} tests passés")

    if checks_passed == total_checks:
        print("🎉 VÉRIFICATION COMPLÈTE RÉUSSIE")
        return True
    else:
        print(f"⚠️ {total_checks - checks_passed} ÉCHEC(S)")
        return False

if __name__ == '__main__':
    # Vérifier tous les fichiers du projet
    files_to_check = [
        ('/mnt/kimi/output/server.js', 'server_js'),
        ('/mnt/kimi/output/package.json', 'json'),
        ('/mnt/kimi/output/admin.html', 'html'),
        ('/mnt/kimi/output/index.html', 'html'),
        ('/mnt/kimi/output/telecharger-client.html', 'html'),
    ]

    all_passed = True
    for filepath, file_type in files_to_check:
        if not verify_file(filepath, file_type):
            all_passed = False

    print("\n" + "="*60)
    if all_passed:
        print("🎉🎉🎉 TOUS LES FICHIERS SONT VALIDÉS 🎉🎉🎉")
        sys.exit(0)
    else:
        print("❌❌❌ CERTAINS FICHIERS ONT DES ERREURS ❌❌❌")
        sys.exit(1)
