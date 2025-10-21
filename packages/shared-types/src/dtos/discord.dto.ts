// // packages/shared-types/src/dtos/discord.dto.ts

// import { EventType } from "../enums/eventTypes.enum";

// // N'oublie pas d'ajouter ceci dans packages/shared-types/src/index.ts :
// // export * from './dtos/discord.dto';

// export interface DiscordGatewayDto {
//   url: string;
// }

// export interface DiscordUserDto {
//   id: string;
//   username: string;
//   discriminator: string;
//   globalname?: string;
//   avatar: string | null;
//   bot?: boolean;
//   system?: boolean;
//   mfa_enabled?: boolean;
//   banner?: string | null;
//   accent_color?: number | null;
//   locale?: string;
//   verified?: boolean;
//   email?: string | null;
//   flags?: number;
//   public_flag?: number;
//   premium_type?: number;
//   public_flags?: number;
// }

// export interface AvatarDecorationData {
//   asset: string;
//   sku_id?: string | null;
// }


// export interface GuildUserDTO {
//   id: string;
//   username: string;
//   discriminator: string | null;
//   global_name?: string | null;
//   avatar?: string | null;
//   avatar_decoration_data: AvatarDecorationData | null;
//   bot: boolean;
//   flags?: number | null;
//   premium_type?: number | null;
  
// }

// export interface GuildMemberDTO {
//   user: GuildUserDTO;
//   nick?: string | null;
//   roles: string[];
//   joined_at: string;
//   deaf: boolean;
//   mute: boolean;
// }

// export interface DiscordGuildDto {
//   id: string;
//   name: string;
//   icon: string | null;
//   iconUrl: string | null;
//   owner: boolean;
//   banner: string;
//   permissions: string;
//   hasAdminRights: boolean;
//   memberCount?: number;
//   features?: string[];
// }

// export interface DiscordUserGuildListAvaible {
//   neverAdded: DiscordGuildDto[];
//   inactive: DiscordGuildDto[];
//   active: DiscordGuildDto[];
// }

// export interface DiscordApiErrorDto {
//   message: string;
//   code: number;
// }

// // DTOs "Result" gardés seulement pour les endpoints de diagnostic
// export interface DiscordPingResultDto {
//   success: boolean;
//   latency?: number;
//   gateway?: string;
//   error?: string;
// }

export interface GuildDTO {
	id: string;
	name?: string;
	icon?: string | null;
	ownerId?: string;
	memberCount?: number;
	joined_at?: Date;
}