// apps/bot/tests/helpers/mockFactory.ts

import { 
  Message, 
  User, 
  Guild, 
  GuildMember, 
  TextChannel,
  MessageType,
  Collection,
  Attachment,
  Embed
} from 'discord.js';

/**
 * Crée un mock de Message Discord avec des valeurs par défaut
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
  const defaultMessage = {
    id: '123456789012345678',
    content: 'Test message content',
    
    // Auteur
    author: {
      id: 'user123',
      username: 'TestUser',
      discriminator: '0001',
      bot: false,
      tag: 'TestUser#0001',
    } as User,
    
    // Serveur
    guild: {
      id: 'guild123',
      name: 'Test Guild',
    } as Guild,
    
    guildId: 'guild123',
    
    // Channel
    channel: {
      id: 'channel123',
      name: 'general',
      type: 0, // GUILD_TEXT
      isDMBased: () => false,
    } as TextChannel,
    
    channelId: 'channel123',
    
    // Type de message
    type: MessageType.Default,
    
    // Timestamps
    createdTimestamp: Date.now(),
    createdAt: new Date(),
    editedTimestamp: null,
    editedAt: null,
    
    // Contenu additionnel
    attachments: new Collection<string, Attachment>(),
    embeds: [],
    stickers: new Collection(),  // <-- AJOUTER CETTE LIGNE
    mentions: {
      users: new Collection(),
      roles: new Collection(),
      everyone: false,
      repliedUser: null,
    },
    
    // Méthodes utiles
    reply: jest.fn().mockResolvedValue(undefined),
  };

  return { ...defaultMessage, ...overrides } as unknown as Message;
}

/**
 * Crée un mock de Message avec des attachments
 */
export function createMockMessageWithAttachments(
  attachmentCount: number = 2,
  overrides?: Partial<Message>
): Message {
  const attachments = new Collection<string, Attachment>();
  
  for (let i = 1; i <= attachmentCount; i++) {
    const attachment = {
      id: `attachment${i}`,
      name: `image${i}.png`,
      size: 1024 * i,
      url: `https://cdn.discordapp.com/attachments/123/456/image${i}.png`,
      proxyURL: `https://media.discordapp.net/attachments/123/456/image${i}.png`,
      contentType: 'image/png',
    } as Attachment;
    
    attachments.set(attachment.id, attachment);
  }
  
  return createMockMessage({
    attachments,
    ...overrides,
  });
}

/**
 * Crée un mock de Message avec des embeds
 */
export function createMockMessageWithEmbeds(
  embedCount: number = 1,
  overrides?: Partial<Message>
): Message {
  const embeds: Embed[] = [];
  
  for (let i = 1; i <= embedCount; i++) {
    embeds.push({
      title: `Embed Title ${i}`,
      description: `Embed description ${i}`,
      url: `https://example.com/${i}`,
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
    } as any);
  }
  
  return createMockMessage({
    embeds,
    ...overrides,
  });
}

/**
 * Crée un mock de Message qui est une réponse à un autre message
 */
export function createMockReplyMessage(overrides?: Partial<Message>): Message {
  return createMockMessage({
    type: MessageType.Reply,
    reference: {
      messageId: '999888777666555444',
      channelId: 'channel123',
      guildId: 'guild123',
    } as any,
    ...overrides,
  });
}

/**
 * Crée un mock de Message d'un bot
 */
export function createMockBotMessage(overrides?: Partial<Message>): Message {
  return createMockMessage({
    author: {
      id: 'bot123',
      username: 'TestBot',
      discriminator: '0000',
      bot: true,
      tag: 'TestBot#0000',
    } as User,
    ...overrides,
  });
}

/**
 * Crée un mock de Message système (join, pin, etc.)
 */
export function createMockSystemMessage(
  type: MessageType = MessageType.UserJoin,
  overrides?: Partial<Message>
): Message {
  return createMockMessage({
    type,
    ...overrides,
  });
}

/**
 * Crée un mock de GuildMember
 */
export function createMockMember(overrides?: Partial<GuildMember>): GuildMember {
  return {
    id: 'member123',
    user: {
      id: 'user123',
      username: 'TestMember',
      discriminator: '0001',
      bot: false,
      tag: 'TestMember#0001',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      avatar: null,
      displayAvatarURL: jest.fn(() => 'https://cdn.discordapp.com/embed/avatars/0.png'),
    } as any as User,  // ← Double cast ici
    guild: {
      id: 'guild123',
      name: 'Test Guild',
      memberCount: 100,
      roles: {
        cache: new Collection(),
      },
    } as Guild,
    joinedTimestamp: Date.now(),
    joinedAt: new Date(),
    roles: {
      cache: new Collection(),
      highest: null,
    },
    nickname: null,
    isCommunicationDisabled: jest.fn(() => false),
    communicationDisabledUntil: null,   
    ...overrides,
  } as unknown as GuildMember;
}


/**
 * Crée un mock de Guild
 */
export function createMockGuild(overrides?: Partial<Guild>): Guild {
  return {
    id: 'guild123',
    name: 'Test Guild',
    ownerId: 'owner123',
    memberCount: 100,
    icon: null,
    ...overrides,
  } as unknown as Guild;
}