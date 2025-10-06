# @your-workspace/shared

Package partagé contenant tous les DTOs et types TypeScript utilisés entre le backend et le frontend.

## 📦 Installation

Ce package est utilisé automatiquement dans le monorepo. Pas besoin de l'installer manuellement.

## 📁 Structure

```
src/
├── auth/           # DTOs d'authentification
│   └── index.ts
├── discord/        # DTOs Discord API
│   ├── user.dto.ts
│   ├── guild.dto.ts
│   ├── channel.dto.ts
│   ├── message.dto.ts
│   ├── role.dto.ts
│   ├── member.dto.ts
│   └── index.ts
└── index.ts        # Export principal
```

## 🚀 Utilisation

### Dans le Backend (NestJS)

```typescript
import { 
  LoginResponseDTO, 
  UserDTO,
  DiscordGuildDTO,
  CreateMessageDTO 
} from '@your-workspace/shared';

@Post('login')
async login(): Promise<LoginResponseDTO> {
  // ...
}
```

### Dans le Frontend (Angular)

```typescript
import { 
  UserDTO, 
  DiscordGuildDTO,
  getGuildIconUrl 
} from '@your-workspace/shared';

export class GuildListComponent {
  guilds: DiscordGuildDTO[] = [];

  getIcon(guild: DiscordGuildDTO): string | null {
    return getGuildIconUrl(guild, 256);
  }
}
```

## 📚 DTOs disponibles

### Auth

- `LoginResponseDTO` - Réponse de connexion
- `UserDTO` - Utilisateur de l'application
- `RefreshTokenRequestDTO` / `RefreshTokenResponseDTO` - Refresh tokens
- `AuthStatusDTO` - Statut d'authentification
- `JwtPayloadDTO` - Payload JWT

### Discord

#### Users
- `DiscordUserDTO` - Utilisateur Discord
- `DiscordConnectionDTO` - Connexions de l'utilisateur
- Helpers: `getAvatarUrl()`, `getBannerUrl()`

#### Guilds
- `DiscordGuildDTO` - Guild complète
- `DiscordUserGuildDTO` - Guild partielle
- `ModifyGuildDTO` - DTO pour modification
- Enums: `DiscordVerificationLevel`, `DiscordPremiumTier`, etc.
- Helpers: `getGuildIconUrl()`, `getGuildBannerUrl()`

#### Channels
- `DiscordChannelDTO` - Channel Discord
- `CreateChannelDTO` / `ModifyChannelDTO` - CRUD
- `EditChannelPermissionsDTO` - Permissions
- Enums: `DiscordChannelType`, `DiscordPermissionOverwriteType`

#### Messages
- `DiscordMessageDTO` - Message Discord
- `CreateMessageDTO` / `EditMessageDTO` - CRUD
- `BulkDeleteMessagesDTO` - Suppression en masse
- `DiscordEmbedDTO` - Embeds
- `DiscordAttachmentDTO` - Fichiers joints
- Enums: `DiscordMessageType`, `DiscordMessageFlags`

#### Roles
- `DiscordRoleDTO` - Rôle Discord
- `CreateRoleDTO` / `ModifyRoleDTO` - CRUD
- `ModifyRolePositionsDTO` - Positions
- Enum: `DiscordPermissions` - Toutes les permissions
- Helpers: `hasPermission()`, `isAdmin()`, `getRoleIconUrl()`

#### Members
- `DiscordGuildMemberDTO` - Membre d'une guild
- `AddGuildMemberDTO` / `ModifyGuildMemberDTO` - CRUD
- `CreateGuildBanDTO` - Bannissement
- `DiscordGuildBanDTO` - Ban existant
- Helpers: `getGuildMemberAvatarUrl()`, `isMemberTimedOut()`, `getTimeoutRemaining()`

## 🎨 Helpers disponibles

### Images/Avatars

```typescript
import { getAvatarUrl, getGuildIconUrl, getRoleIconUrl } from '@your-workspace/shared';

// Avatar utilisateur
const avatar = getAvatarUrl(user, 256);

// Icône de guild
const icon = getGuildIconUrl(guild, 128);

// Icône de rôle
const roleIcon = getRoleIconUrl(role, 64);
```

### Permissions

```typescript
import { hasPermission, isAdmin, DiscordPermissions } from '@your-workspace/shared';

// Vérifier une permission spécifique
if (hasPermission(role.permissions, DiscordPermissions.MANAGE_CHANNELS)) {
  // L'utilisateur peut gérer les channels
}

// Vérifier si admin
if (isAdmin(role.permissions)) {
  // L'utilisateur est admin
}
```

### Timeouts

```typescript
import { isMemberTimedOut, getTimeoutRemaining } from '@your-workspace/shared';

if (isMemberTimedOut(member)) {
  const remaining = getTimeoutRemaining(member);
  console.log(`Timeout restant: ${remaining}ms`);
}
```

## 🔄 Mise à jour

Après modification des DTOs, rebuild le package :

```bash
# Dans le dossier packages/shared
npm run build

# Ou depuis la racine
npm run build --workspace=@your-workspace/shared
```

## 📖 Documentation Discord

Les DTOs suivent la documentation officielle Discord :
- [Discord API Documentation](https://discord.com/developers/docs/)
- [Resources](https://discord.com/developers/docs/resources/user)
- [Permissions](https://discord.com/developers/docs/topics/permissions)

## ✨ Conventions

- **DTO** suffix pour les Data Transfer Objects
- **Enum** pour les valeurs prédéfinies
- **Helpers** pour les fonctions utilitaires
- Nommage en `PascalCase`
- Propriétés en `snake_case` (suivant l'API Discord)
