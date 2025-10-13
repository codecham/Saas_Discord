// apps/bot/tests/unit/listeners/members/guildMemberUpdate.spec.ts

import { GuildMemberUpdateListener } from '../../../../src/listeners/members/guildMemberUpdate';
import { EventType } from '@my-project/shared-types';
import { Collection } from 'discord.js';
import { 
  setupTestContainer, 
  expectEventSent, 
  expectNoEventSent 
} from '../../../helpers/testHelpers';
import { createMockMember } from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('GuildMemberUpdateListener', () => {
  let listener: GuildMemberUpdateListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new GuildMemberUpdateListener({} as any, {});
    
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
      
      const oldMember = createMockMember({ nickname: 'OldNick' } as any);
      const newMember = createMockMember({ nickname: 'NewNick' } as any);
      
      await listener.run(oldMember, newMember);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should be enabled when listener config is enabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
      
      const oldMember = createMockMember({ nickname: 'OldNick' } as any);
      const newMember = createMockMember({ nickname: 'NewNick' } as any);
      
      await listener.run(oldMember, newMember);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Détection des changements', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should not send event when no changes detected', async () => {
      const member1 = createMockMember({
        nickname: 'SameNick',
        roles: {
          cache: new Collection([['role1', { id: 'role1' } as any]]),
        } as any,
      } as any);
      
      const member2 = createMockMember({
        nickname: 'SameNick',
        roles: {
          cache: new Collection([['role1', { id: 'role1' } as any]]),
        } as any,
      } as any);
      
      await listener.run(member1, member2);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should detect nickname change', async () => {
      const oldMember = createMockMember({
        nickname: 'OldNickname',
      } as any);
      
      const newMember = createMockMember({
        nickname: 'NewNickname',
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.nickname).toBeDefined();
          expect(evt.data.changes.nickname.old).toBe('OldNickname');
          expect(evt.data.changes.nickname.new).toBe('NewNickname');
        }
      );
    });
    
    it('should detect nickname removal (set to null)', async () => {
      const oldMember = createMockMember({
        nickname: 'HasNickname',
      } as any);
      
      const newMember = createMockMember({
        nickname: null,
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.nickname).toBeDefined();
          expect(evt.data.changes.nickname.old).toBe('HasNickname');
          expect(evt.data.changes.nickname.new).toBeUndefined();
        }
      );
    });
    
    it('should detect nickname addition (from null)', async () => {
      const oldMember = createMockMember({
        nickname: null,
      } as any);
      
      const newMember = createMockMember({
        nickname: 'NewNickname',
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.nickname).toBeDefined();
          expect(evt.data.changes.nickname.old).toBeUndefined();
          expect(evt.data.changes.nickname.new).toBe('NewNickname');
        }
      );
    });
    
    it('should detect role addition', async () => {
      const oldRoles = new Collection();
      oldRoles.set('role1', { id: 'role1', name: 'Member' } as any);
      
      const newRoles = new Collection();
      newRoles.set('role1', { id: 'role1', name: 'Member' } as any);
      newRoles.set('role2', { id: 'role2', name: 'Moderator' } as any);
      
      const oldMember = createMockMember({
        roles: {
          cache: oldRoles,
        } as any,
      } as any);
      
      const newMember = createMockMember({
        roles: {
          cache: newRoles,
        } as any,
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.roles).toBeDefined();
          expect(evt.data.changes.roles.added).toHaveLength(1);
          expect(evt.data.changes.roles.added[0].id).toBe('role2');
          expect(evt.data.changes.roles.removed).toHaveLength(0);
        }
      );
    });
    
    it('should detect role removal', async () => {
      const oldRoles = new Collection();
      oldRoles.set('role1', { id: 'role1', name: 'Member' } as any);
      oldRoles.set('role2', { id: 'role2', name: 'Moderator' } as any);
      
      const newRoles = new Collection();
      newRoles.set('role1', { id: 'role1', name: 'Member' } as any);
      
      const oldMember = createMockMember({
        roles: {
          cache: oldRoles,
        } as any,
      } as any);
      
      const newMember = createMockMember({
        roles: {
          cache: newRoles,
        } as any,
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.roles).toBeDefined();
          expect(evt.data.changes.roles.removed).toHaveLength(1);
          expect(evt.data.changes.roles.removed[0].id).toBe('role2');
          expect(evt.data.changes.roles.added).toHaveLength(0);
        }
      );
    });
    
    it('should detect multiple role changes (add and remove)', async () => {
      const oldRoles = new Collection();
      oldRoles.set('role1', { id: 'role1', name: 'Member' } as any);
      oldRoles.set('role2', { id: 'role2', name: 'Trial' } as any);
      
      const newRoles = new Collection();
      newRoles.set('role1', { id: 'role1', name: 'Member' } as any);
      newRoles.set('role3', { id: 'role3', name: 'Verified' } as any);
      newRoles.set('role4', { id: 'role4', name: 'Active' } as any);
      
      const oldMember = createMockMember({
        roles: {
          cache: oldRoles,
        } as any,
      } as any);
      
      const newMember = createMockMember({
        roles: {
          cache: newRoles,
        } as any,
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.roles).toBeDefined();
          expect(evt.data.changes.roles.added).toHaveLength(2);
          expect(evt.data.changes.roles.added.find((r: any) => r.id === 'role3')).toBeDefined();
          expect(evt.data.changes.roles.added.find((r: any) => r.id === 'role4')).toBeDefined();
          expect(evt.data.changes.roles.removed).toHaveLength(1);
          expect(evt.data.changes.roles.removed[0].id).toBe('role2');
        }
      );
    });
    
    it('should detect multiple changes at once', async () => {
      const oldRoles = new Collection();
      oldRoles.set('role1', { id: 'role1' } as any);
      
      const newRoles = new Collection();
      newRoles.set('role1', { id: 'role1' } as any);
      newRoles.set('role2', { id: 'role2' } as any);
      
      const oldMember = createMockMember({
        nickname: 'OldNick',
        roles: {
          cache: oldRoles,
        } as any,
      } as any);
      
      const newMember = createMockMember({
        nickname: 'NewNick',
        roles: {
          cache: newRoles,
        } as any,
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.nickname).toBeDefined();
          expect(evt.data.changes.nickname.old).toBe('OldNick');
          expect(evt.data.changes.nickname.new).toBe('NewNick');
          
          expect(evt.data.changes.roles).toBeDefined();
          expect(evt.data.changes.roles.added).toHaveLength(1);
          expect(evt.data.changes.roles.added[0].id).toBe('role2');
        }
      );
    });
  });

  describe('Gestion des partials', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should handle oldMember being partial', async () => {
      const oldPartialMember = {
        id: 'member123',
        user: {
          id: 'user123',
          username: 'TestUser',
        } as any,
        guild: {
          id: 'guild123',
          name: 'Test Guild',
        } as any,
        nickname: null,
        roles: undefined,
      } as any;
      
      const newMember = createMockMember({
        nickname: 'NewNickname',
      } as any);
      
      await listener.run(oldPartialMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.nickname).toBeDefined();
          expect(evt.data.changes.nickname.new).toBe('NewNickname');
        }
      );
    });
    
    it('should handle oldMember with Map roles (older Discord.js)', async () => {
      const oldRolesMap = new Map();
      oldRolesMap.set('role1', { id: 'role1' });
      
      const oldMember = createMockMember({
        roles: oldRolesMap as any,
      } as any);
      
      const newRoles = new Collection();
      newRoles.set('role1', { id: 'role1' } as any);
      newRoles.set('role2', { id: 'role2' } as any);
      
      const newMember = createMockMember({
        roles: {
          cache: newRoles,
        } as any,
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.changes.roles).toBeDefined();
          expect(evt.data.changes.roles.added).toHaveLength(2);
          // Vérifier que role1 et role2 sont tous les deux ajoutés
          const addedIds = evt.data.changes.roles.added.map((r: any) => r.id);
          expect(addedIds).toContain('role1');
          expect(addedIds).toContain('role2');
        }
      );
    });
  });

  describe('Extraction des données du membre', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract member info correctly', async () => {
      const oldMember = createMockMember({
        nickname: 'OldNick',
      } as any);
      
      const newMember = createMockMember({
        user: {
          id: 'user456',
          username: 'UpdatedUser',
          bot: false,
        } as any,
        guild: {
          id: 'guild789',
          name: 'Updated Guild',
        } as any,
        nickname: 'NewNick',
      } as any);
      
      await listener.run(oldMember, newMember);
      
      expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild789',
        (evt) => {
          expect(evt.userId).toBe('user456');
          expect(evt.guildId).toBe('guild789');
          expect(evt.data.userId).toBe('user456');
          expect(evt.data.username).toBe('UpdatedUser');
        }
      );
    });
  });

  describe('Structure de l\'événement BotEventDto', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should create valid BotEventDto structure', async () => {
      const oldMember = createMockMember({ nickname: 'Old' } as any);
      const newMember = createMockMember({ nickname: 'New' } as any);
      
      await listener.run(oldMember, newMember);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123'
      );
      
      expect(event).toMatchObject({
        type: EventType.GUILD_MEMBER_UPDATE,
        guildId: 'guild123',
        userId: 'user123',
        timestamp: expect.any(Number),
        data: expect.any(Object),
      });
      
      const now = Date.now();
      expect(event.timestamp).toBeGreaterThan(now - 1000);
      expect(event.timestamp).toBeLessThanOrEqual(now);
    });
    
    it('should have changes object in data', async () => {
      const oldMember = createMockMember({ nickname: 'Old' } as any);
      const newMember = createMockMember({ nickname: 'New' } as any);
      
      await listener.run(oldMember, newMember);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123'
      );
      
      expect(event.data).toHaveProperty('userId');
      expect(event.data).toHaveProperty('username');
      expect(event.data).toHaveProperty('changes');
      expect(typeof event.data.changes).toBe('object');
    });
    
    it('should include only changed fields in changes object', async () => {
      const oldMember = createMockMember({ nickname: 'OldNick' } as any);
      const newMember = createMockMember({ nickname: 'NewNick' } as any);
      
      await listener.run(oldMember, newMember);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.GUILD_MEMBER_UPDATE,
        'guild123'
      );
      
      expect(event.data.changes.nickname).toBeDefined();
      // Les rôles n'ont pas changé, donc ne devraient pas être dans changes
      expect(event.data.changes.roles).toBeUndefined();
    });
  });
});