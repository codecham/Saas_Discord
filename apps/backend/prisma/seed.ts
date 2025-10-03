// apps/backend/prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Supprimer les données existantes
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await prisma.refreshToken.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Hash des mots de passe pour les tests
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Créer des utilisateurs de test
  const users = await Promise.all([
    // Admin avec mot de passe local
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: new Date(),
      },
    }),

    // Utilisateur normal avec mot de passe local
    prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Regular User',
        password: hashedPassword,
        role: Role.USER,
        isActive: true,
        emailVerified: new Date(),
      },
    }),

    // Utilisateur OAuth Google (pas de mot de passe)
    prisma.user.create({
      data: {
        email: 'google@example.com',
        name: 'Google User',
        role: Role.USER,
        isActive: true,
        emailVerified: new Date(),
        accounts: {
          create: {
            provider: 'google',
            providerAccountId: 'google-12345',
            type: 'oauth',
          },
        },
      },
    }),

    // Utilisateur OAuth Discord
    prisma.user.create({
      data: {
        email: 'discord@example.com',
        name: 'Discord User',
        role: Role.USER,
        isActive: true,
        emailVerified: new Date(),
        accounts: {
          create: {
            provider: 'discord',
            providerAccountId: 'discord-67890',
            type: 'oauth',
          },
        },
      },
    }),
  ]);

  console.log(`✅ Créé ${users.length} utilisateurs de test`);
  users.forEach((user) => {
    console.log(`👤 ${user.name} (${user.email}) - ${user.role}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
