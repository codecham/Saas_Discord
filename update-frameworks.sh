#!/bin/bash

echo "🚀 Mise à jour des frameworks vers les dernières versions"
echo "=================================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "apps/frontend" ] || [ ! -d "apps/backend" ]; then
    print_error "Erreur : Les dossiers apps/frontend et apps/backend n'existent pas."
    print_error "Assurez-vous d'être à la racine du projet."
    exit 1
fi

print_step "Mise à jour d'Angular..."
echo ""

# Aller dans le dossier frontend
cd apps/frontend

# Mettre à jour Angular CLI globalement
print_step "Mise à jour d'Angular CLI (global)..."
npm install -g @angular/cli@latest

# Mettre à jour Angular dans le projet
print_step "Mise à jour d'Angular dans le projet..."
ng update @angular/core @angular/cli --force

# Mettre à jour les autres dépendances Angular courantes
print_step "Mise à jour des dépendances Angular..."
ng update @angular/cdk @angular/material --force 2>/dev/null || echo "CDK/Material non installés, on continue..."

print_success "Angular mis à jour !"
echo ""

# Revenir à la racine puis aller dans backend
cd ../../apps/backend

print_step "Mise à jour de NestJS..."
echo ""

# Mettre à jour NestJS CLI globalement
print_step "Mise à jour de Nest CLI (global)..."
npm install -g @nestjs/cli@latest

# Mettre à jour les dépendances NestJS dans le projet
print_step "Mise à jour des dépendances NestJS..."
npm install @nestjs/core@latest @nestjs/common@latest @nestjs/platform-express@latest

# Mettre à jour les dev dependencies
print_step "Mise à jour des dev dependencies NestJS..."
npm install -D @nestjs/cli@latest @nestjs/schematics@latest @nestjs/testing@latest

print_success "NestJS mis à jour !"
echo ""

# Revenir à la racine
cd ../..

print_success "Mise à jour terminée !"
echo ""
print_step "📊 Versions finales installées :"
echo ""

# Afficher les versions finales
echo -n "Node.js: "
node --version 2>/dev/null || echo "Version non détectée"

echo -n "npm: "
npm --version 2>/dev/null || echo "Version non détectée"

echo -n "TypeScript (global): "
tsc --version 2>/dev/null || echo "Version non détectée"

cd apps/frontend
echo -n "Angular: "
ng version --quiet 2>/dev/null | head -1 || echo "Version non détectée"

cd ../backend
echo -n "NestJS: "
nest --version 2>/dev/null || echo "Version non détectée"

cd ../..

echo ""
print_success "🎉 Toutes les mises à jour sont terminées !"
print_warning "N'oubliez pas de tester que tout fonctionne encore correctement !"

echo ""
echo "Pour tester :"
echo "- Frontend: cd apps/frontend && npm start"
echo "- Backend: cd apps/backend && npm run start:dev"


touch packages/shared-types/src/dtos/app/guild-setup/guild-setup.enums.ts &&
touch packages/shared-types/src/dtos/app/guild-setup/guild-settings.dto.ts &&
touch packages/shared-types/src/dtos/app/guild-setup/guild-setup-status.dto.ts &&
touch packages/shared-types/src/dtos/app/guild-setup/quick-start.dto.ts &&
touch packages/shared-types/src/dtos/app/guild-setup/backfill.dto.ts