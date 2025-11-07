// packages/shared-types/src/index.ts

// Les exports seront ajoutés au fur et à mesure
// export * from './dtos/user.dto';  // ← Ajouté plus tard
// export * from './enums/user-role.enum';  // ← Ajouté plus tard

/*
	DTO utilisé par l'application
*/
export * from './dtos/app/auth/auth.dto'
export * from './dtos/app/app-discord.dto';
export * from './dtos/app/events/botEvent.dto';
export * from './dtos/app/guild-setup';
export * from './dtos/app/modules';

/*
	DTO raw api discord 
*/
export * from './dtos/discord/user.dto';
export * from './dtos/discord/guild.dto';
export * from './dtos/discord/channel.dto';
export * from './dtos/discord/message.dto';
export * from './dtos/discord/role.dto';
export * from './dtos/discord/member.dto';


export * from './enums/eventTypes.enum';

// Pour l'instant, on peut mettre un placeholder
export const SHARED_TYPES_VERSION = '1.0.0';