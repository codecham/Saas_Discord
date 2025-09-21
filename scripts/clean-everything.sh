#!/bin/bash

echo "🧨 NETTOYAGE COMPLET - Suppression de TOUT"
echo "==============================================="

read -p "Êtes-vous sûr de vouloir tout supprimer ? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Opération annulée"
    exit 1
fi

echo "🛑 Arrêt de tous les processus..."

# Arrêter tous les processus de développement
pkill -f "nest start" 2>/dev/null || true
pkill -f "ng serve" 2>/dev/null || true
pkill -f "tsc --watch" 2>/dev/null || true

echo "🐳 Nettoyage Docker complet..."

# Arrêter tous les conteneurs du projet
docker-compose -f infrastructure/docker/docker-compose.dev.yml down 2>/dev/null || true

# Supprimer tous les conteneurs liés au projet
docker rm -f myproject-postgres-dev myproject-redis-dev myproject-adminer-dev 2>/dev/null || true

# Supprimer tous les volumes
docker volume prune -f

# Optionnel : supprimer les images si vous voulez vraiment TOUT nettoyer
docker image prune -f

echo "📦 Suppression des node_modules..."

# Supprimer tous les node_modules
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

echo "🔨 Nettoyage des builds..."

# Supprimer tous les dossiers de build
rm -rf apps/*/dist
rm -rf packages/*/dist
rm -rf apps/frontend/.angular
rm -rf apps/frontend/tmp

echo "🗃️ Nettoyage Prisma..."

# Supprimer le client Prisma généré
rm -rf apps/backend/node_modules/.prisma 2>/dev/null || true

echo "📄 Nettoyage des logs et cache..."

# Supprimer les logs et fichiers temporaires
rm -rf *.log
rm -rf apps/*/*.log
rm -rf .npm
rm -rf .cache
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

echo "✅ Nettoyage terminé !"
echo ""
echo "Pour redémarrer complètement :"
echo "1. npm run setup"
echo "2. npm run dev:all"