#!/usr/bin/env node

/**
 * 📊 Progress Tracker CLI - Version 2.0
 * 
 * Compatible avec le nouveau format PROGRESS_TRACKER.json
 * Gestion de roadmap MVP sur 4 semaines
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface Task {
  id: string;
  name: string;
  description?: string;
  estimatedHours: number;
  actualHours?: number;
  phase: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progress?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  completedAt?: string;
  startedAt?: string;
  notes?: string;
}

interface Phase {
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  duration: string;
  tasks: {
    total: number;
    completed: number;
    percentage: number;
  };
  description: string;
  completedAt?: string;
}

interface ProgressData {
  meta: {
    lastUpdate: string;
    version: string;
    projectName: string;
  };
  current: {
    phase: string;
    phaseName: string;
    sprint: string;
    task: Task;
  };
  phases: Record<string, Phase>;
  completedTasks: Task[];
  roadmap: {
    mvpTarget: string;
    nextMilestone: string;
    blockers: Array<{
      taskId: string;
      description: string;
      createdAt: string;
    }>;
  };
  allTasks?: Task[]; // Liste complète de toutes les tâches
}

// ============================================
// CONFIGURATION
// ============================================

const PROGRESS_FILE = path.join(process.cwd(), 'docs', 'roadmaps', 'PROGRESS_TRACKER.json');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadProgress(): ProgressData {
  if (!fs.existsSync(PROGRESS_FILE)) {
    console.error(`${colors.red}❌ Fichier ${PROGRESS_FILE} introuvable${colors.reset}`);
    process.exit(1);
  }
  
  const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveProgress(data: ProgressData): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function formatDate(): string {
  return new Date().toISOString();
}

function formatDateShort(): string {
  return new Date().toISOString().split('T')[0];
}

function printHeader(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function getProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return `${colors.green}✓${colors.reset}`;
    case 'in_progress':
      return `${colors.yellow}⚡${colors.reset}`;
    case 'blocked':
      return `${colors.red}⊗${colors.reset}`;
    default:
      return `${colors.dim}○${colors.reset}`;
  }
}

function getAllTasks(data: ProgressData): Task[] {
  // Si allTasks existe dans le fichier, l'utiliser
  if (data.allTasks && data.allTasks.length > 0) {
    return data.allTasks;
  }
  
  // Sinon, reconstruire la liste depuis completedTasks + current task
  const tasks: Task[] = [...data.completedTasks];
  
  // Ajouter la tâche actuelle si elle n'est pas dans completedTasks
  if (!tasks.some(t => t.id === data.current.task.id)) {
    tasks.push(data.current.task);
  }
  
  return tasks;
}

function findTask(data: ProgressData, taskId: string): Task | undefined {
  const allTasks = getAllTasks(data);
  return allTasks.find(t => t.id === taskId);
}

function getNextTask(data: ProgressData): Task | undefined {
  const allTasks = getAllTasks(data);
  const incompleteTasks = allTasks.filter(t => t.status !== 'completed');
  
  // Si la tâche actuelle n'est pas complétée, c'est elle la prochaine
  if (data.current.task.status !== 'completed') {
    return data.current.task;
  }
  
  // Sinon, trouver la prochaine tâche non complétée
  return incompleteTasks[0];
}

function calculateStats(data: ProgressData) {
  const allTasks = getAllTasks(data);
  const completedTasks = data.completedTasks;
  
  const totalEstimatedHours = allTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const completedHours = completedTasks.reduce((sum, t) => sum + (t.actualHours || t.estimatedHours || 0), 0);
  const percentComplete = allTasks.length > 0 
    ? Math.round((completedTasks.length / allTasks.length) * 100) 
    : 0;
  
  return {
    totalTasks: allTasks.length,
    completedTasks: completedTasks.length,
    remainingTasks: allTasks.length - completedTasks.length,
    totalEstimatedHours,
    completedHours,
    remainingHours: totalEstimatedHours - completedHours,
    percentComplete,
  };
}

// ============================================
// COMMANDS
// ============================================

function status(): void {
  const data = loadProgress();
  const stats = calculateStats(data);
  
  printHeader('📊 STATUS DU PROJET');
  
  console.log(`${colors.bright}Projet:${colors.reset} ${data.meta.projectName}`);
  console.log(`${colors.bright}Phase actuelle:${colors.reset} ${data.current.phaseName}`);
  console.log(`${colors.bright}Sprint:${colors.reset} ${data.current.sprint}`);
  console.log(`${colors.bright}Dernière mise à jour:${colors.reset} ${new Date(data.meta.lastUpdate).toLocaleString('fr-FR')}\n`);
  
  // Stats globales
  console.log(`${colors.bright}${colors.cyan}📈 PROGRESSION GLOBALE${colors.reset}\n`);
  console.log(`${getProgressBar(stats.percentComplete)} ${colors.cyan}${stats.percentComplete}%${colors.reset}`);
  console.log(`${colors.bright}Tâches:${colors.reset} ${colors.green}${stats.completedTasks}${colors.reset}/${stats.totalTasks} complétées (${stats.remainingTasks} restantes)`);
  console.log(`${colors.bright}Heures:${colors.reset} ${colors.green}${stats.completedHours}h${colors.reset}/${stats.totalEstimatedHours}h (${stats.remainingHours}h restantes)\n`);
  
  // Tâche actuelle
  console.log(`${colors.bright}${colors.yellow}⚡ TÂCHE EN COURS${colors.reset}\n`);
  const currentTask = data.current.task;
  console.log(`${colors.bright}[${currentTask.id}]${colors.reset} ${currentTask.name}`);
  console.log(`${colors.bright}Status:${colors.reset} ${getStatusIcon(currentTask.status)} ${currentTask.status}`);
  console.log(`${colors.bright}Progression:${colors.reset} ${currentTask.progress || 0}%`);
  console.log(`${colors.bright}Temps estimé:${colors.reset} ${currentTask.estimatedHoursRemaining || currentTask.estimatedHours || 0}h restantes\n`);
  
  // Phases
  console.log(`${colors.bright}${colors.blue}📋 PHASES${colors.reset}\n`);
  Object.entries(data.phases).forEach(([phaseId, phase]) => {
    const statusIcon = getStatusIcon(phase.status);
    const percentage = phase.tasks.percentage;
    console.log(`${statusIcon} ${colors.bright}${phase.name}${colors.reset} (${phaseId})`);
    console.log(`   ${getProgressBar(percentage, 15)} ${percentage}% • ${phase.tasks.completed}/${phase.tasks.total} tâches • ${phase.duration}`);
  });
  
  console.log();
  
  // Blockers si existants
  if (data.roadmap.blockers.length > 0) {
    console.log(`${colors.bright}${colors.red}⊗ BLOCAGES${colors.reset}\n`);
    data.roadmap.blockers.forEach((blocker) => {
      console.log(`${colors.red}•${colors.reset} [${blocker.taskId}] ${blocker.description}`);
      console.log(`  ${colors.dim}Créé le ${blocker.createdAt}${colors.reset}`);
    });
    console.log();
  }
  
  // Prochaine tâche
  const nextTask = getNextTask(data);
  if (nextTask && nextTask.id !== currentTask.id) {
    console.log(`${colors.bright}${colors.cyan}🎯 PROCHAINE TÂCHE${colors.reset}\n`);
    console.log(`[${nextTask.id}] ${nextTask.name}`);
    console.log(`Temps estimé: ${nextTask.estimatedHours}h\n`);
    console.log(`${colors.dim}Pour démarrer: npm run progress:start ${nextTask.id}${colors.reset}\n`);
  }
}

function next(): void {
  const data = loadProgress();
  const stats = calculateStats(data);
  
  printHeader('🎯 PROCHAINE TÂCHE');
  
  if (stats.remainingTasks === 0) {
    console.log(`${colors.green}🎉 Toutes les tâches sont terminées !${colors.reset}\n`);
    return;
  }
  
  const nextTask = getNextTask(data);
  
  if (!nextTask) {
    console.log(`${colors.yellow}⚠️  Aucune tâche suivante trouvée${colors.reset}\n`);
    return;
  }
  
  console.log(`${colors.bright}ID:${colors.reset} ${nextTask.id}`);
  console.log(`${colors.bright}Nom:${colors.reset} ${nextTask.name}`);
  console.log(`${colors.bright}Phase:${colors.reset} ${nextTask.phase}`);
  console.log(`${colors.bright}Temps estimé:${colors.reset} ${nextTask.estimatedHours}h`);
  
  if (nextTask.description) {
    console.log(`${colors.bright}Description:${colors.reset}\n${nextTask.description}`);
  }
  
  if (nextTask.priority) {
    const priorityColor = nextTask.priority === 'critical' || nextTask.priority === 'high' 
      ? colors.red 
      : nextTask.priority === 'medium' 
        ? colors.yellow 
        : colors.dim;
    console.log(`${colors.bright}Priorité:${colors.reset} ${priorityColor}${nextTask.priority}${colors.reset}`);
  }
  
  if (nextTask.dependencies && nextTask.dependencies.length > 0) {
    console.log(`${colors.bright}Dépendances:${colors.reset} ${nextTask.dependencies.join(', ')}`);
  }
  
  console.log(`\n${colors.cyan}Pour démarrer: npm run progress:start ${nextTask.id}${colors.reset}\n`);
}

function start(taskId: string): void {
  const data = loadProgress();
  const task = findTask(data, taskId);
  
  if (!task) {
    console.log(`${colors.red}❌ Tâche ${taskId} introuvable${colors.reset}`);
    console.log(`${colors.dim}Utilisez 'npm run progress:list' pour voir toutes les tâches${colors.reset}\n`);
    return;
  }
  
  if (task.status === 'completed') {
    console.log(`${colors.yellow}⚠️  Cette tâche est déjà complétée${colors.reset}\n`);
    return;
  }
  
  // Mettre à jour le statut
  task.status = 'in_progress';
  task.startedAt = formatDate();
  task.progress = 0;
  
  // Mettre à jour current task
  data.current.task = { ...task };
  data.current.phase = task.phase;
  data.current.phaseName = data.phases[task.phase]?.name || task.phase;
  
  // Mettre à jour la phase
  if (data.phases[task.phase]) {
    data.phases[task.phase].status = 'in_progress';
  }
  
  // Update meta
  data.meta.lastUpdate = formatDate();
  
  saveProgress(data);
  
  printHeader('✅ TÂCHE DÉMARRÉE');
  console.log(`${colors.green}✓${colors.reset} Tâche ${colors.bright}${taskId}${colors.reset} - ${task.name}`);
  console.log(`${colors.dim}Phase: ${task.phase}${colors.reset}`);
  console.log(`${colors.dim}Temps estimé: ${task.estimatedHours}h${colors.reset}\n`);
  console.log(`${colors.cyan}Prochaines commandes:${colors.reset}`);
  console.log(`  ${colors.dim}npm run progress:update ${taskId} <percentage>${colors.reset} - Mettre à jour la progression`);
  console.log(`  ${colors.dim}npm run progress:complete ${taskId} <heures>${colors.reset} - Marquer comme complétée\n`);
}

function update(taskId: string, percentage: number): void {
  const data = loadProgress();
  
  if (data.current.task.id !== taskId) {
    console.log(`${colors.red}❌ Cette tâche n'est pas la tâche en cours${colors.reset}`);
    console.log(`${colors.yellow}Tâche en cours: ${data.current.task.id}${colors.reset}\n`);
    return;
  }
  
  if (percentage < 0 || percentage > 100) {
    console.log(`${colors.red}❌ Le pourcentage doit être entre 0 et 100${colors.reset}\n`);
    return;
  }
  
  data.current.task.progress = percentage;
  data.current.task.estimatedHoursRemaining = Math.round(
    ((100 - percentage) / 100) * (data.current.task.estimatedHours || 0)
  );
  
  data.meta.lastUpdate = formatDate();
  
  saveProgress(data);
  
  console.log(`${colors.green}✓${colors.reset} Progression mise à jour: ${colors.bright}${percentage}%${colors.reset}`);
  console.log(`${colors.dim}Temps restant estimé: ${data.current.task.estimatedHoursRemaining}h${colors.reset}\n`);
}

function complete(taskId: string, actualHours?: number): void {
  const data = loadProgress();
  const task = findTask(data, taskId);
  
  if (!task) {
    console.log(`${colors.red}❌ Tâche ${taskId} introuvable${colors.reset}\n`);
    return;
  }
  
  if (task.status === 'completed') {
    console.log(`${colors.yellow}⚠️  Cette tâche est déjà complétée${colors.reset}\n`);
    return;
  }
  
  // Marquer comme complétée
  task.status = 'completed';
  task.completedAt = formatDateShort();
  task.progress = 100;
  task.actualHours = actualHours || task.estimatedHours || 0;
  
  // Ajouter à completedTasks si pas déjà dedans
  if (!data.completedTasks.some(t => t.id === taskId)) {
    data.completedTasks.push(task);
  } else {
    // Mettre à jour la tâche existante
    const index = data.completedTasks.findIndex(t => t.id === taskId);
    data.completedTasks[index] = task;
  }
  
  // Mettre à jour les stats de la phase
  const phase = data.phases[task.phase];
  if (phase) {
    phase.tasks.completed += 1;
    phase.tasks.percentage = Math.round((phase.tasks.completed / phase.tasks.total) * 100);
    
    // Si toutes les tâches de la phase sont complétées
    if (phase.tasks.completed === phase.tasks.total) {
      phase.status = 'completed';
      phase.completedAt = formatDateShort();
    }
  }
  
  // Trouver la prochaine tâche
  const nextTask = getNextTask(data);
  if (nextTask && nextTask.id !== taskId) {
    data.current.task = { ...nextTask };
    data.current.phase = nextTask.phase;
    data.current.phaseName = data.phases[nextTask.phase]?.name || nextTask.phase;
  }
  
  // Update meta
  data.meta.lastUpdate = formatDate();
  
  saveProgress(data);
  
  printHeader('✅ TÂCHE COMPLÉTÉE');
  console.log(`${colors.green}✓${colors.reset} Tâche ${colors.bright}${taskId}${colors.reset} - ${task.name}`);
  console.log(`${colors.dim}Temps estimé: ${task.estimatedHours}h | Temps réel: ${task.actualHours}h${colors.reset}`);
  
  const variance = task.actualHours - task.estimatedHours;
  if (variance === 0) {
    console.log(`${colors.green}✓ Estimation parfaite !${colors.reset}`);
  } else if (variance > 0) {
    console.log(`${colors.yellow}⚠️  +${variance}h de dépassement${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ ${Math.abs(variance)}h gagnées !${colors.reset}`);
  }
  
  // Stats de la phase
  if (phase) {
    console.log(`\n${colors.bright}Progression ${phase.name}:${colors.reset}`);
    console.log(`${getProgressBar(phase.tasks.percentage, 20)} ${phase.tasks.percentage}% (${phase.tasks.completed}/${phase.tasks.total})`);
  }
  
  // Prochaine tâche
  if (nextTask && nextTask.id !== taskId) {
    console.log(`\n${colors.bright}${colors.cyan}Prochaine tâche:${colors.reset}`);
    console.log(`[${nextTask.id}] ${nextTask.name} (${nextTask.estimatedHours}h)`);
    console.log(`\n${colors.dim}Pour démarrer: npm run progress:start ${nextTask.id}${colors.reset}`);
  } else {
    console.log(`\n${colors.green}🎉 Toutes les tâches sont terminées !${colors.reset}`);
  }
  
  console.log();
}

function note(message: string): void {
  const data = loadProgress();
  
  // Ajouter la note à la tâche actuelle
  if (!data.current.task.notes) {
    data.current.task.notes = '';
  }
  
  const timestamp = new Date().toISOString();
  const noteEntry = `[${timestamp}] ${message}`;
  
  data.current.task.notes += (data.current.task.notes ? '\n' : '') + noteEntry;
  data.meta.lastUpdate = formatDate();
  
  saveProgress(data);
  
  console.log(`${colors.green}✓${colors.reset} Note ajoutée à la tâche ${colors.bright}${data.current.task.id}${colors.reset}\n`);
  console.log(`${colors.dim}${message}${colors.reset}\n`);
}

function addBlocker(taskId: string, description: string): void {
  const data = loadProgress();
  
  data.roadmap.blockers.push({
    taskId,
    description,
    createdAt: formatDateShort(),
  });
  
  // Mettre à jour le statut de la tâche si c'est la tâche actuelle
  if (data.current.task.id === taskId) {
    data.current.task.status = 'blocked';
  }
  
  data.meta.lastUpdate = formatDate();
  saveProgress(data);
  
  console.log(`${colors.red}⊗${colors.reset} Blocker ajouté pour la tâche ${colors.bright}${taskId}${colors.reset}\n`);
  console.log(`${colors.dim}${description}${colors.reset}\n`);
}

function list(): void {
  const data = loadProgress();
  const allTasks = getAllTasks(data);
  
  printHeader('📋 LISTE DES TÂCHES');
  
  const tasksByPhase: Record<string, Task[]> = {};
  
  allTasks.forEach(task => {
    if (!tasksByPhase[task.phase]) {
      tasksByPhase[task.phase] = [];
    }
    tasksByPhase[task.phase].push(task);
  });
  
  Object.entries(tasksByPhase).forEach(([phaseId, tasks]) => {
    const phase = data.phases[phaseId];
    if (!phase) return;
    
    console.log(`\n${colors.bright}${colors.blue}${phase.name}${colors.reset} (${phaseId})\n`);
    
    tasks.forEach(task => {
      const icon = getStatusIcon(task.status);
      const progress = task.progress ? ` - ${task.progress}%` : '';
      console.log(`  ${icon} [${task.id}] ${task.name} (${task.estimatedHours}h)${progress}`);
    });
  });
  
  console.log();
}

function help(): void {
  printHeader('📖 AIDE - PROGRESS TRACKER CLI');
  
  console.log(`${colors.bright}COMMANDES DISPONIBLES:${colors.reset}\n`);
  
  console.log(`${colors.cyan}npm run progress${colors.reset}`);
  console.log(`  Affiche le status global du projet\n`);
  
  console.log(`${colors.cyan}npm run progress:next${colors.reset}`);
  console.log(`  Affiche la prochaine tâche à faire\n`);
  
  console.log(`${colors.cyan}npm run progress:start <taskId>${colors.reset}`);
  console.log(`  Démarre une tâche spécifique (ex: npm run progress:start 1.1)\n`);
  
  console.log(`${colors.cyan}npm run progress:update <taskId> <percentage>${colors.reset}`);
  console.log(`  Met à jour la progression (ex: npm run progress:update 1.1 50)\n`);
  
  console.log(`${colors.cyan}npm run progress:complete <taskId> <heures>${colors.reset}`);
  console.log(`  Marque une tâche comme complétée (ex: npm run progress:complete 1.1 8)\n`);
  
  console.log(`${colors.cyan}npm run progress:note "<message>"${colors.reset}`);
  console.log(`  Ajoute une note à la tâche en cours\n`);
  
  console.log(`${colors.cyan}npm run progress:block <taskId> "<description>"${colors.reset}`);
  console.log(`  Déclare un blocker sur une tâche\n`);
  
  console.log(`${colors.cyan}npm run progress:list${colors.reset}`);
  console.log(`  Liste toutes les tâches par phase\n`);
  
  console.log(`${colors.bright}EXEMPLES:${colors.reset}\n`);
  console.log(`  ${colors.dim}npm run progress:start 1.1${colors.reset}`);
  console.log(`  ${colors.dim}npm run progress:update 1.1 75${colors.reset}`);
  console.log(`  ${colors.dim}npm run progress:complete 1.1 8${colors.reset}`);
  console.log(`  ${colors.dim}npm run progress:note "Décision: Utiliser TimescaleDB continuous aggregates"${colors.reset}`);
  console.log(`  ${colors.dim}npm run progress:block 1.2 "Attente validation architecture"${colors.reset}\n`);
}

// ============================================
// CLI ENTRY POINT
// ============================================

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'status':
  case undefined:
    status();
    break;
  
  case 'next':
    next();
    break;
  
  case 'start':
    if (!args[1]) {
      console.log(`${colors.red}❌ Usage: npm run progress:start <taskId>${colors.reset}\n`);
      process.exit(1);
    }
    start(args[1]);
    break;
  
  case 'update':
    if (!args[1] || !args[2]) {
      console.log(`${colors.red}❌ Usage: npm run progress:update <taskId> <percentage>${colors.reset}\n`);
      process.exit(1);
    }
    update(args[1], parseInt(args[2]));
    break;
  
  case 'complete':
    if (!args[1]) {
      console.log(`${colors.red}❌ Usage: npm run progress:complete <taskId> [heures]${colors.reset}\n`);
      process.exit(1);
    }
    complete(args[1], args[2] ? parseFloat(args[2]) : undefined);
    break;
  
  case 'note':
    if (!args[1]) {
      console.log(`${colors.red}❌ Usage: npm run progress:note "<message>"${colors.reset}\n`);
      process.exit(1);
    }
    note(args.slice(1).join(' '));
    break;
  
  case 'block':
    if (!args[1] || !args[2]) {
      console.log(`${colors.red}❌ Usage: npm run progress:block <taskId> "<description>"${colors.reset}\n`);
      process.exit(1);
    }
    addBlocker(args[1], args.slice(2).join(' '));
    break;
  
  case 'list':
    list();
    break;
  
  case 'help':
  case '-h':
  case '--help':
    help();
    break;
  
  default:
    console.log(`${colors.red}❌ Commande inconnue: ${command}${colors.reset}\n`);
    help();
    process.exit(1);
}
