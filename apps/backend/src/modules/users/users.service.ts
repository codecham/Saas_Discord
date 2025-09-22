import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type {
  UserDto,
  RegisterDto,
  UpdateUserDto,
} from '@my-project/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RegisterDto): Promise<UserDto> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        isActive: true,
      },
    });

    return this.toUserDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });
  }

  async findById(id: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true, // Inclure les comptes OAuth liés
      },
    });

    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      avatar: user.avatar || undefined,
      role: user.role,
      isActive: user.isActive,
      emailVerified: !!user.emailVerified,
      createdAt: user.createdAt,
      accounts: user.accounts.map((account) => ({
        provider: account.provider,
        accessToken: account.accessToken,
        providerAccountId: account.providerAccountId,
      })),
    };
  }

  async update(id: string, data: UpdateUserDto): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toUserDto(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  }

  // Créer ou mettre à jour un utilisateur OAuth
  async findOrCreateOAuthUser(
    email: string,
    name: string,
    provider: string,
    providerAccountId: string,
    avatar?: string,
    accessToken?: string,
    refreshToken?: string,
  ): Promise<User> {
    // Chercher utilisateur existant
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (user) {
      // Vérifier si le compte OAuth existe déjà
      const existingAccount = user.accounts.find(
        (account) => account.provider === provider,
      );

      if (!existingAccount) {
        // Créer nouveau compte OAuth
        await this.prisma.account.create({
          data: {
            userId: user.id,
            provider,
            providerAccountId,
            type: 'oauth',
            accessToken,
            refreshToken,
          },
        });
      } else {
        // CORRIGER ICI : Mettre à jour les tokens du compte existant
        await this.prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accessToken,
            refreshToken,
          },
        });
      }
    } else {
      // Créer nouvel utilisateur avec compte OAuth
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar,
          emailVerified: new Date(),
          isActive: true,
          accounts: {
            create: {
              provider,
              providerAccountId,
              type: 'oauth',
              accessToken, // CORRIGER ICI : Ajouter les tokens
              refreshToken, // CORRIGER ICI : Ajouter les tokens
            },
          },
        },
        include: { accounts: true },
      });
    }

    return user;
  }

  // Convertir User Prisma en UserDto public
  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      avatar: user.avatar || undefined,
      role: user.role,
      isActive: user.isActive,
      emailVerified: !!user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
