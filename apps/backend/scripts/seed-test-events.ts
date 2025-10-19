/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
// apps/backend/scripts/seed-test-events.ts

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv'; // 🆕 Ajouter cet import
import * as path from 'path'; // 🆕 Ajouter cet import

dotenv.config({ path: path.join(__dirname, '../.env.development') });

const prisma = new PrismaClient();

/**
 * 🌱 Script de génération de données de test
 *
 * Crée des events fictifs pour tester l'agrégation
 */
async function seedTestEvents() {
  console.log('🌱 Début du seeding...');

  // Remplace par l'ID de ton serveur de test
  const TEST_GUILD_ID = '1250545664547622994'; // ⚠️ À REMPLACER

  // Période : dernières 24h
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const events: Array<{
    type: string;
    guildId: string;
    userId?: string | null;
    channelId?: string | null;
    messageId?: string | null;
    roleId?: string | null;
    shardId?: number | null;
    timestamp: Date;
    data?: any;
  }> = [];
  const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
  const channelIds = ['channel1', 'channel2', 'channel3'];

  console.log(
    `📅 Génération d'events entre ${yesterday.toISOString()} et ${now.toISOString()}`,
  );

  // Générer des events toutes les 5 minutes sur 24h
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timestamp = new Date(yesterday);
      timestamp.setHours(hour, minute, 0, 0);

      // 1. Messages (10-50 par période de 5min)
      const messageCount = Math.floor(Math.random() * 40) + 10;
      for (let i = 0; i < messageCount; i++) {
        events.push({
          type: 'MESSAGE_CREATE',
          guildId: TEST_GUILD_ID,
          userId: userIds[Math.floor(Math.random() * userIds.length)],
          channelId: channelIds[Math.floor(Math.random() * channelIds.length)],
          timestamp: new Date(
            timestamp.getTime() + Math.random() * 5 * 60 * 1000,
          ),
          data: { content: `Test message ${i}` },
        });
      }

      // 2. Réactions (5-15 par période)
      const reactionCount = Math.floor(Math.random() * 10) + 5;
      for (let i = 0; i < reactionCount; i++) {
        events.push({
          type: 'MESSAGE_REACTION_ADD',
          guildId: TEST_GUILD_ID,
          userId: userIds[Math.floor(Math.random() * userIds.length)],
          channelId: channelIds[Math.floor(Math.random() * channelIds.length)],
          timestamp: new Date(
            timestamp.getTime() + Math.random() * 5 * 60 * 1000,
          ),
          data: { emoji: '👍' },
        });
      }

      // 3. Events vocaux (2-6 par période)
      const voiceCount = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < voiceCount; i++) {
        events.push({
          type: 'VOICE_STATE_UPDATE',
          guildId: TEST_GUILD_ID,
          userId: userIds[Math.floor(Math.random() * userIds.length)],
          channelId: channelIds[Math.floor(Math.random() * channelIds.length)],
          timestamp: new Date(
            timestamp.getTime() + Math.random() * 5 * 60 * 1000,
          ),
          data: { type: i % 2 === 0 ? 'join' : 'leave' },
        });
      }
    }
  }

  console.log(`📊 ${events.length} events générés`);
  console.log('💾 Insertion dans la base de données...');

  // Insérer par batch de 1000
  const batchSize = 1000;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await prisma.event.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(
      `   ✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} inséré`,
    );
  }

  // Statistiques
  const stats = await prisma.event.groupBy({
    by: ['type'],
    where: {
      guildId: TEST_GUILD_ID,
    },
    _count: {
      type: true,
    },
  });

  console.log('\n📊 Statistiques finales :');
  stats.forEach((stat) => {
    console.log(`   ${stat.type}: ${stat._count.type} events`);
  });

  const total = await prisma.event.count({
    where: { guildId: TEST_GUILD_ID },
  });

  console.log(
    `\n✅ Total : ${total} events créés pour le guild ${TEST_GUILD_ID}`,
  );
  console.log(`\n🎯 Tu peux maintenant tester l'agrégation avec :`);
  console.log(
    `   curl -X POST http://localhost:3000/events/test/aggregate-5min/${TEST_GUILD_ID}`,
  );
}

// Exécuter le script
seedTestEvents()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
