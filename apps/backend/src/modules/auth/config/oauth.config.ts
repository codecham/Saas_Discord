import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OAuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
}

@Injectable()
export class OAuthConfigService {
  constructor(private readonly configService: ConfigService) {}

  getEnabledProviders(): string[] {
    const providers = this.configService.get<string>('AUTH_PROVIDERS', 'local');
    const allProviders = providers.split(',').map((p) => p.trim());

    // Filtrer seulement les providers réellement activés sans récursion
    return allProviders.filter((provider) => {
      if (provider === 'local') {
        return (
          this.configService.get<string>('LOCAL_ENABLED', 'true') === 'true'
        );
      }

      // Vérification directe sans appeler isProviderEnabled() qui créerait la récursion
      const specificFlag = this.configService.get<string>(
        `${provider.toUpperCase()}_ENABLED`,
        'false',
      );
      return specificFlag === 'true';
    });
  }

  isProviderEnabled(provider: string): boolean {
    const enabledProviders = this.getEnabledProviders();
    const specificFlag = this.configService.get<string>(
      `${provider.toUpperCase()}_ENABLED`,
      'false',
    );

    return enabledProviders.includes(provider) && specificFlag === 'true';
  }

  getGoogleConfig(): OAuthProviderConfig {
    const enabled = this.isProviderEnabled('google');
    return {
      enabled,
      clientId: enabled
        ? this.configService.get<string>('GOOGLE_CLIENT_ID')
        : undefined,
      clientSecret: enabled
        ? this.configService.get<string>('GOOGLE_CLIENT_SECRET')
        : undefined,
      callbackUrl: enabled ? this.getCallbackUrl('google') : undefined,
    };
  }

  getDiscordConfig(): OAuthProviderConfig {
    const enabled = this.isProviderEnabled('discord');
    return {
      enabled,
      clientId: enabled
        ? this.configService.get<string>('DISCORD_CLIENT_ID')
        : undefined,
      clientSecret: enabled
        ? this.configService.get<string>('DISCORD_CLIENT_SECRET')
        : undefined,
      callbackUrl: enabled ? this.getCallbackUrl('discord') : undefined,
    };
  }

  private getCallbackUrl(provider: string): string {
    const baseUrl = this.configService.get<string>(
      'BACKEND_URL',
      'http://localhost:3000',
    );
    return `${baseUrl}/api/auth/${provider}/callback`;
  }

  validateRequiredConfig(): void {
    const enabledProviders = this.getEnabledProviders().filter(
      (p) => p !== 'local',
    );

    for (const provider of enabledProviders) {
      if (this.isProviderEnabled(provider)) {
        // Typage strict avec switch au lieu d'accès dynamique
        let config: OAuthProviderConfig | undefined;

        switch (provider) {
          case 'google':
            config = this.getGoogleConfig();
            break;
          case 'discord':
            config = this.getDiscordConfig();
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }

        if (!config.clientId || !config.clientSecret) {
          throw new Error(
            `${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET must be configured when ${provider} is enabled`,
          );
        }
      }
    }
  }
}
