// packages/shared-types/src/index.ts

// Les exports seront ajoutés au fur et à mesure
// export * from './dtos/user.dto';  // ← Ajouté plus tard
// export * from './enums/user-role.enum';  // ← Ajouté plus tard

export * from './dtos/auth.dto';
export * from './dtos/test.dto';
export * from './dtos/demo.dto';
export * from './dtos/discord.dto';
export * from './dtos/gateway.dto';
export * from './enums/eventTypes.enum';

// Pour l'instant, on peut mettre un placeholder
export const SHARED_TYPES_VERSION = '1.0.0';