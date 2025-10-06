import { registerAs } from '@nestjs/config';

export default registerAs('discord', () => ({
  enabled: process.env.DISCORD_ENABLED === 'true',
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  botToken: process.env.DISCORD_BOT_TOKEN,
  apiVersion: process.env.DISCORD_API_VERSION || 'v10',
  apiBaseUrl: process.env.DISCORD_API_BASE_URL || 'https://discord.com/api',
}));
