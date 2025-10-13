import { GuildMemberAddListener } from '../../../../src/listeners/members/guildMemberAdd';
import { EventType } from '@my-project/shared-types';
import { 
  setupTestContainer, 
  expectEventSent, 
  expectNoEventSent 
} from '../../../helpers/testHelpers';
import { createMockMember } from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('GuildMemberAddListener', () => {
  let listener: GuildMemberAddListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new GuildMemberAddListener({} as any, {});
    
    Object.defineProperty(listener, 'container', {
      value: {
        eventBatcher: mockEventBatcher,
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        }
      },
      writable: true,
      configurable: true
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration du listener', () => {
    it('should be disabled when listener config is disabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(false);
      
      const member = createMockMember();
      
      await listener.run(member);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should be enabled when listener config is enabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
      
      const member = createMockMember();
      
      await listener.run(member);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Extraction des données du membre', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract basic member data correctly', async () => {
      const member = createMockMember({
        user: {
          id: 'user456',
          username: 'NewMember',
          discriminator: '1234',
          bot: false,
          tag: 'NewMember#1234',
          createdAt: new Date('2023-01-01'),
          avatar: 'avatar123',
          displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/user456/avatar123.png',
        } as any,
        guild: {
          id: 'guild789',
          name: 'Test Server',
          memberCount: 150,
        } as any,
        joinedAt: new Date('2024-01-15T10:00:00Z'),
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild789',
        (evt) => {
          expect(evt.data.userId).toBe('user456');
          expect(evt.data.username).toBe('NewMember');
          expect(evt.data.bot).toBe(false);
          expect(evt.data.joinedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
          expect(evt.data.avatar).toBe('avatar123');
          expect(evt.data.avatarURL).toBe('https://cdn.discordapp.com/avatars/user456/avatar123.png');
          expect(evt.data.guildMemberCount).toBe(150);
        }
      );
    });
    
    it('should detect bot accounts', async () => {
      const botMember = createMockMember({
        user: {
          id: 'bot123',
          username: 'CoolBot',
          bot: true,
          tag: 'CoolBot#0000',
          createdAt: new Date('2023-06-01'),
          displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/bot123/avatar.png',
        } as any,
      } as any);
      
      await listener.run(botMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.bot).toBe(true);
          expect(evt.data.username).toBe('CoolBot');
        }
      );
    });
    
    it('should calculate account age in days', async () => {
      const accountCreatedDate = new Date('2024-01-01');
      const joinDate = new Date('2024-01-15'); // 14 jours plus tard
      
      const member = createMockMember({
        user: {
          id: 'user789',
          username: 'RecentUser',
          bot: false,
          createdAt: accountCreatedDate,
          displayAvatarURL: () => 'https://example.com/avatar.png',
        } as any,
        joinedAt: joinDate,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.accountCreatedAt).toEqual(accountCreatedDate);
          expect(evt.data.accountAgeInDays).toBeGreaterThanOrEqual(0);
          // Le compte a au moins quelques jours
          expect(typeof evt.data.accountAgeInDays).toBe('number');
        }
      );
    });
    
    it('should handle member with discriminator 0 (new username system)', async () => {
      const member = createMockMember({
        user: {
          id: 'user999',
          username: 'modernuser',
          discriminator: '0',
          globalName: 'Modern User',
          bot: false,
          tag: 'modernuser',
          createdAt: new Date(),
          displayAvatarURL: () => 'https://example.com/avatar.png',
        } as any,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.discriminator).toBeUndefined();
          expect(evt.data.globalName).toBe('Modern User');
          expect(evt.data.username).toBe('modernuser');
        }
      );
    });
    
    it('should handle member with old discriminator system', async () => {
      const member = createMockMember({
        user: {
          id: 'user888',
          username: 'olduser',
          discriminator: '1234',
          bot: false,
          tag: 'olduser#1234',
          createdAt: new Date(),
          displayAvatarURL: () => 'https://example.com/avatar.png',
        } as any,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.discriminator).toBe('1234');
          expect(evt.data.username).toBe('olduser');
        }
      );
    });
    
    it('should handle member without avatar', async () => {
      const member = createMockMember({
        user: {
          id: 'user777',
          username: 'NoAvatarUser',
          bot: false,
          avatar: null,
          createdAt: new Date(),
          displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
        } as any,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.avatar).toBeNull();
          // L'URL par défaut devrait toujours être présente
          expect(evt.data.avatarURL).toBeDefined();
        }
      );
    });
    
    it('should handle member without joinedAt (rare edge case)', async () => {
      const member = createMockMember({
        joinedAt: null,
      } as any);
      
      const beforeRun = Date.now();
      await listener.run(member);
      const afterRun = Date.now();
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123',
        (evt) => {
          expect(evt.data.joinedAt).toBeInstanceOf(Date);
          const joinedTime = evt.data.joinedAt.getTime();
          expect(joinedTime).toBeGreaterThanOrEqual(beforeRun);
          expect(joinedTime).toBeLessThanOrEqual(afterRun);
        }
      );
    });
  });

  describe('Structure de l\'événement BotEventDto', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should create valid BotEventDto structure', async () => {
      const member = createMockMember();
      
      await listener.run(member);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123'
      );
      
      expect(event).toMatchObject({
        type: EventType.GUILD_MEMBER_ADD,
        guildId: 'guild123',
        userId: 'user123',
        timestamp: expect.any(Number),
        data: expect.any(Object),
      });
      
      const now = Date.now();
      expect(event.timestamp).toBeGreaterThan(now - 1000);
      expect(event.timestamp).toBeLessThanOrEqual(now);
    });
    
    it('should have all required data fields', async () => {
      const member = createMockMember();
      
      await listener.run(member);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_ADD,
        'guild123'
      );
      
      expect(event.data).toHaveProperty('userId');
      expect(event.data).toHaveProperty('username');
      expect(event.data).toHaveProperty('bot');
      expect(event.data).toHaveProperty('joinedAt');
      expect(event.data).toHaveProperty('accountCreatedAt');
      expect(event.data).toHaveProperty('accountAgeInDays');
      expect(event.data).toHaveProperty('guildMemberCount');
      expect(event.data).toHaveProperty('avatarURL');
    });
  });
});