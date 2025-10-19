#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Types
interface Task {
  id: string;
  name: string;
  completedAt?: string;
  phase: string;
  estimatedHours?: number;
  actualHours?: number;
  status?: string;
  progress?: number;
  estimatedHoursRemaining?: number;
  priority?: string;
  dependencies?: string[];
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
  phases: Record<string, any>;
  completedTasks: Task[];
  upcomingTasks: Task[];
  blockers: any[];
  notes: Array<{ date: string; content: string }>;
  stats: any;
}

// Paths
const PROGRESS_FILE = path.join(process.cwd(), 'docs', 'roadmaps', 'PROGRESS_TRACKER.json');
const STATUS_FILE = path.join(process.cwd(), 'docs', 'roadmaps', 'STATUS.md');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Helper functions
function loadProgress(): ProgressData {
  const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveProgress(data: ProgressData): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function formatDate(): string {
  return new Date().toISOString();
}

function printHeader(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function printTask(task: Task, withIndex: boolean = false, index?: number): void {
  const prefix = withIndex ? `${colors.yellow}[${index}]${colors.reset} ` : '';
  const status = task.status === 'completed' ? `${colors.green}✓${colors.reset}` : 
                 task.status === 'in_progress' ? `${colors.yellow}⋯${colors.reset}` : 
                 `${colors.blue}○${colors.reset}`;
  console.log(`  ${prefix}${status} ${colors.bright}${task.id}${colors.reset} - ${task.name}`);
  if (task.completedAt) {
    console.log(`     ${colors.green}Complété le: ${task.completedAt}${colors.reset}`);
  }
  if (task.progress !== undefined) {
    const progressBar = '█'.repeat(Math.floor(task.progress / 10)) + '░'.repeat(10 - Math.floor(task.progress / 10));
    console.log(`     Progression: ${colors.cyan}${progressBar}${colors.reset} ${task.progress}%`);
  }
}

// Commands
function status(): void {
  const data = loadProgress();
  
  printHeader('📊 STATUS DU PROJET');
  
  console.log(`${colors.bright}Projet:${colors.reset} ${data.meta.projectName}`);
  console.log(`${colors.bright}Phase actuelle:${colors.reset} ${data.current.phaseName}`);
  console.log(`${colors.bright}Sprint:${colors.reset} ${data.current.sprint}`);
  console.log(`${colors.bright}Progression globale:${colors.reset} ${colors.cyan}${data.stats.percentComplete}%${colors.reset}\n`);
  
  console.log(`${colors.bright}${colors.yellow}🔥 Tâche en cours:${colors.reset}`);
  printTask(data.current.task);
  
  if (data.completedTasks.length > 0) {
    console.log(`\n${colors.bright}${colors.green}✅ Dernières tâches complétées (7 derniers jours):${colors.reset}`);
    const recentTasks = data.completedTasks.slice(-5);
    recentTasks.forEach(task => printTask(task));
  }
  
  console.log(`\n${colors.bright}${colors.blue}📋 Prochaines tâches:${colors.reset}`);
  data.upcomingTasks.slice(0, 5).forEach((task, i) => printTask(task, true, i + 1));
  
  if (data.blockers.length > 0) {
    console.log(`\n${colors.bright}${colors.red}🚫 Blocages:${colors.reset}`);
    data.blockers.forEach(blocker => console.log(`  - ${blocker}`));
  } else {
    console.log(`\n${colors.green}✓ Aucun blocage${colors.reset}`);
  }
  
  console.log('');
}

function complete(taskId: string, actualHours?: number): void {
  const data = loadProgress();
  
  // Find task in upcoming
  const taskIndex = data.upcomingTasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    console.log(`${colors.red}❌ Tâche ${taskId} non trouvée${colors.reset}`);
    return;
  }
  
  const task = data.upcomingTasks[taskIndex];
  
  // Move to completed
  const completedTask: Task = {
    ...task,
    completedAt: new Date().toISOString().split('T')[0],
    actualHours: actualHours || task.estimatedHours,
    status: 'completed',
  };
  
  data.completedTasks.push(completedTask);
  data.upcomingTasks.splice(taskIndex, 1);
  
  // Update phase progress
  const phase = data.phases[task.phase];
  if (phase) {
    phase.tasks.completed += 1;
    phase.tasks.percentage = Math.round((phase.tasks.completed / phase.tasks.total) * 100);
    
    if (phase.tasks.completed === phase.tasks.total) {
      phase.status = 'completed';
      phase.completedAt = new Date().toISOString().split('T')[0];
    }
  }
  
  // Update current task if needed
  if (data.current.task.id === taskId && data.upcomingTasks.length > 0) {
    const nextTask = data.upcomingTasks[0];
    data.current.task = {
	  id: nextTask.id,
	  name: nextTask.name,
	  phase: nextTask.phase,  // ← Ajoute cette ligne
	  status: 'not_started',
	  progress: 0,
	  estimatedHoursRemaining: nextTask.estimatedHours || 0,
	};
  }
  
  // Update stats
  data.stats.completedHours += completedTask.actualHours || 0;
  data.stats.percentComplete = Math.round((data.stats.completedHours / data.stats.totalEstimatedHours) * 100);
  
  // Update meta
  data.meta.lastUpdate = formatDate();
  
  saveProgress(data);
  
  console.log(`${colors.green}✓ Tâche ${taskId} - ${task.name} marquée comme complétée !${colors.reset}`);
  console.log(`${colors.cyan}Progression globale: ${data.stats.percentComplete}%${colors.reset}`);
  
  if (data.upcomingTasks.length > 0) {
    console.log(`\n${colors.bright}Prochaine tâche suggérée:${colors.reset}`);
    printTask(data.upcomingTasks[0]);
  }
}

function next(): void {
  const data = loadProgress();
  
  printHeader('🎯 PROCHAINE TÂCHE');
  
  if (data.upcomingTasks.length === 0) {
    console.log(`${colors.green}🎉 Toutes les tâches sont terminées !${colors.reset}\n`);
    return;
  }
  
  const nextTask = data.upcomingTasks[0];
  
  console.log(`${colors.bright}ID:${colors.reset} ${nextTask.id}`);
  console.log(`${colors.bright}Nom:${colors.reset} ${nextTask.name}`);
  console.log(`${colors.bright}Phase:${colors.reset} ${nextTask.phase}`);
  console.log(`${colors.bright}Priorité:${colors.reset} ${nextTask.priority}`);
  console.log(`${colors.bright}Temps estimé:${colors.reset} ${nextTask.estimatedHours}h`);
  
  if (nextTask.dependencies && nextTask.dependencies.length > 0) {
    console.log(`${colors.bright}Dépendances:${colors.reset} ${nextTask.dependencies.join(', ')}`);
  }
  
  console.log(`\n${colors.cyan}Pour démarrer: npm run progress:start ${nextTask.id}${colors.reset}\n`);
}

function progressCmd(taskId: string, percent: number): void {
  const data = loadProgress();
  
  if (data.current.task.id !== taskId) {
    console.log(`${colors.red}❌ Cette tâche n'est pas la tâche en cours${colors.reset}`);
    console.log(`${colors.yellow}Tâche en cours: ${data.current.task.id}${colors.reset}`);
    return;
  }
  
  data.current.task.progress = percent;
  data.current.task.estimatedHoursRemaining = Math.round(
    ((100 - percent) / 100) * (data.current.task.estimatedHoursRemaining || 0)
  );
  data.meta.lastUpdate = formatDate();
  
  saveProgress(data);
  
  const progressBar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
  console.log(`${colors.green}✓ Progression mise à jour${colors.reset}`);
  console.log(`  ${colors.cyan}${progressBar}${colors.reset} ${percent}%`);
  console.log(`  Temps restant estimé: ${data.current.task.estimatedHoursRemaining}h`);
}

function addNote(note: string): void {
  const data = loadProgress();
  
  data.notes.push({
    date: new Date().toISOString().split('T')[0],
    content: note,
  });
  
  data.meta.lastUpdate = formatDate();
  saveProgress(data);
  
  console.log(`${colors.green}✓ Note ajoutée${colors.reset}`);
}

function startTask(taskId: string): void {
  const data = loadProgress();
  
  const task = data.upcomingTasks.find(t => t.id === taskId);
  
  if (!task) {
    console.log(`${colors.red}❌ Tâche ${taskId} non trouvée${colors.reset}`);
    return;
  }
  
  data.current.task = {
	id: task.id,
	name: task.name,
	phase: task.phase,  // ← Ajoute cette ligne
	status: 'in_progress',
	progress: 0,
	estimatedHoursRemaining: task.estimatedHours || 0,
  };

  
  data.meta.lastUpdate = formatDate();
  saveProgress(data);
  
  console.log(`${colors.green}✓ Tâche ${taskId} démarrée !${colors.reset}`);
  console.log(`${colors.cyan}${task.name}${colors.reset}`);
  console.log(`\nPour mettre à jour la progression: npm run progress:update ${taskId} <percentage>`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'status':
    status();
    break;
  
  case 'complete':
    if (!args[1]) {
      console.log(`${colors.red}Usage: npm run progress:complete <task-id> [actual-hours]${colors.reset}`);
      process.exit(1);
    }
    complete(args[1], args[2] ? parseInt(args[2]) : undefined);
    break;
  
  case 'next':
    next();
    break;
  
  case 'progress':
    if (!args[1] || !args[2]) {
      console.log(`${colors.red}Usage: npm run progress:update <task-id> <percentage>${colors.reset}`);
      process.exit(1);
    }
    progressCmd(args[1], parseInt(args[2]));
    break;
  
  case 'note':
    if (!args[1]) {
      console.log(`${colors.red}Usage: npm run progress:note "Your note here"${colors.reset}`);
      process.exit(1);
    }
    addNote(args.slice(1).join(' '));
    break;
  
  case 'start':
    if (!args[1]) {
      console.log(`${colors.red}Usage: npm run progress:start <task-id>${colors.reset}`);
      process.exit(1);
    }
    startTask(args[1]);
    break;
  
  default:
    console.log(`${colors.bright}Discord Admin App - Progress Tracker${colors.reset}\n`);
    console.log('Commandes disponibles:');
    console.log(`  ${colors.cyan}npm run progress${colors.reset}                           - Voir le status actuel`);
    console.log(`  ${colors.cyan}npm run progress:next${colors.reset}                      - Voir la prochaine tâche`);
    console.log(`  ${colors.cyan}npm run progress:start <task-id>${colors.reset}           - Démarrer une tâche`);
    console.log(`  ${colors.cyan}npm run progress:update <task-id> <%>${colors.reset}      - Mettre à jour la progression`);
    console.log(`  ${colors.cyan}npm run progress:complete <task-id> [hours]${colors.reset} - Marquer comme complétée`);
    console.log(`  ${colors.cyan}npm run progress:note "text"${colors.reset}               - Ajouter une note`);
    console.log('');
}