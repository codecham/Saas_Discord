import { User } from '@prisma/client';
import { UsersService } from '../../users/users.service';

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export abstract class BaseOAuthProvider {
  constructor(protected readonly usersService: UsersService) {}

  async handleOAuthCallback(profile: OAuthProfile): Promise<User> {
    return this.usersService.findOrCreateOAuthUser(
      profile.email,
      profile.name,
      profile.provider,
      profile.id,
      profile.avatar,
    );
  }

  abstract getProviderName(): string;
}
