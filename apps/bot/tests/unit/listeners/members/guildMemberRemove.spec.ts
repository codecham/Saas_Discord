import { GuildMemberRemoveListener } from '../../../../src/listeners/members/guildMemberRemove';
import { EventType } from '@my-project/shared-types';
import { Collection } from 'discord.js';
import { 
  setupTestContainer, 
  expectEventSent, 
  expectNoEventSent 
} from '../../../helpers/testHelpers';
import { createMockMember } from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('GuildMemberRemoveListener', () => {
  let listener: GuildMemberRemoveListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new GuildMemberRemoveListener({} as any, {});
    
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
      const roles = new Collection();
      roles.set('role1', { id: 'role1', name: 'Member' } as any);
      roles.set('role2', { id: 'role2', name: 'Verified' } as any);
      
      const member = createMockMember({
        user: {
          id: 'user456',
          username: 'LeavingMember',
          discriminator: '5678',
          bot: false,
          tag: 'LeavingMember#5678',
          avatar: 'avatar456',
          displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/user456/avatar456.png',
        } as any,
        guild: {
          id: 'guild789',
          name: 'Test Server',
          memberCount: 149, // Un membre en moins
        } as any,
        joinedAt: new Date('2023-06-15T10:00:00Z'),
        nickname: 'LeavingNick',
        roles: {
          cache: roles,
        } as any,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild789',
        (evt) => {
          expect(evt.data.userId).toBe('user456');
          expect(evt.data.username).toBe('LeavingMember');
          expect(evt.data.bot).toBe(false);
          expect(evt.data.nickname).toBe('LeavingNick');
          expect(evt.data.joinedAt).toEqual(new Date('2023-06-15T10:00:00Z'));
          expect(evt.data.roles).toEqual(['role1', 'role2']);
          expect(evt.data.guildMemberCount).toBe(149);
          expect(evt.data.leftAt).toBeInstanceOf(Date);
        }
      );
    });
    
    it('should detect bot leaving', async () => {
      const botMember = createMockMember({
        user: {
          id: 'bot456',
          username: 'RemovedBot',
          bot: true,
          tag: 'RemovedBot#0000',
          displayAvatarURL: () => 'https://example.com/bot.png',
        } as any,
      } as any);
      
      await listener.run(botMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.bot).toBe(true);
        }
      );
    });
    
    it('should calculate membership duration when joinedAt is available', async () => {
      const joinedDate = new Date('2023-01-01T00:00:00Z');
      
      const member = createMockMember({
        joinedAt: joinedDate,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.joinedAt).toEqual(joinedDate);
          expect(evt.data.membershipDurationInDays).toBeDefined();
          expect(typeof evt.data.membershipDurationInDays).toBe('number');
          expect(evt.data.membershipDurationInDays).toBeGreaterThan(0);
        }
      );
    });
    
    it('should handle member without joinedAt (partial)', async () => {
      const member = createMockMember({
        joinedAt: null,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.joinedAt).toBeUndefined();
          expect(evt.data.membershipDurationInDays).toBeUndefined();
        }
      );
    });
    
    it('should handle member with discriminator 0 (new system)', async () => {
      const member = createMockMember({
        user: {
          id: 'user888',
          username: 'modernleaver',
          discriminator: '0',
          globalName: 'Modern Leaver',
          bot: false,
          tag: 'modernleaver',
          displayAvatarURL: () => 'https://example.com/avatar.png',
        } as any,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.discriminator).toBeUndefined();
          expect(evt.data.globalName).toBe('Modern Leaver');
        }
      );
    });
    
    it('should handle member without nickname', async () => {
      const member = createMockMember({
        nickname: null,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.nickname).toBeUndefined();
        }
      );
    });
    
    it('should extract roles correctly', async () => {
      const roles = new Collection();
      roles.set('role1', { id: 'role1', name: 'Admin' } as any);
      roles.set('role2', { id: 'role2', name: 'Moderator' } as any);
      roles.set('role3', { id: 'role3', name: 'VIP' } as any);
      
      const member = createMockMember({
        roles: {
          cache: roles,
        } as any,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.roles).toHaveLength(3);
          expect(evt.data.roles).toContain('role1');
          expect(evt.data.roles).toContain('role2');
          expect(evt.data.roles).toContain('role3');
        }
      );
    });
    
    it('should handle member without roles (partial)', async () => {
      const member = createMockMember({
        roles: undefined,
      } as any);
      
      await listener.run(member);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.roles).toBeUndefined();
        }
      );
    });
    
    it('should set leftAt timestamp', async () => {
      const member = createMockMember();
      
      const beforeRun = Date.now();
      await listener.run(member);
      const afterRun = Date.now();
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_REMOVE,
        'guild123',
        (evt) => {
          expect(evt.data.leftAt).toBeInstanceOf(Date);
          const leftTime = evt.data.leftAt.getTime();
          expect(leftTime).toBeGreaterThanOrEqual(beforeRun);
          expect(leftTime).toBeLessThanOrEqual(afterRun);
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
        EventType.GUILD_MEMBER_REMOVE,
        'guild123'
      );
      
      expect(event).toMatchObject({
        type: EventType.GUILD_MEMBER_REMOVE,
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
        EventType.GUILD_MEMBER_REMOVE,
        'guild123'
      );
      
      expect(event.data).toHaveProperty('userId');
      expect(event.data).toHaveProperty('username');
      expect(event.data).toHaveProperty('bot');
      expect(event.data).toHaveProperty('avatar');
      expect(event.data).toHaveProperty('avatarURL');
      expect(event.data).toHaveProperty('guildMemberCount');
      expect(event.data).toHaveProperty('leftAt');
    });
  });
});