import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRegistry } from './registry/module.registry';
import { ModuleManagerService } from './services/module-manager.service';
import { ModuleSystemController } from './controllers/module-system.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WELCOME_MODULE } from 'src/modules/welcome/welcome.definition';

/**
 * 🧩 Module System Module
 *
 * Module central du système de modules.
 * S'occupe de l'enregistrement et de la gestion des modules.
 */
@Module({
  imports: [PrismaModule],
  providers: [ModuleRegistry, ModuleManagerService],
  controllers: [ModuleSystemController],
  exports: [ModuleRegistry, ModuleManagerService],
})
export class ModuleSystemModule implements OnModuleInit {
  constructor(private readonly moduleRegistry: ModuleRegistry) {}

  /**
   * Enregistre les modules au démarrage
   */
  onModuleInit() {
    // TODO: Importer et enregistrer tous les modules ici
    // Sera fait en Phase 3
    console.log('📦 Module System initialized');
    this.moduleRegistry.register(WELCOME_MODULE);
  }
}
