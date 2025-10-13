import { MessageDeleteBulkListener } from '../../../../src/listeners/messages/messageDeleteBulk';
import { EventType } from '@my-project/shared-types';
import { Collection, Message, PartialMessage, Snowflake } from 'discord.js';
import { 
  setupTestContainer, 
  expectEventSent, 
  expectNoEventSent 
} from '../../../helpers/testHelpers';
import { 
  createMockMessage,
  createMockBotMessage
} from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('MessageDeleteBulkListener', () => {
  let listener: MessageDeleteBulkListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new MessageDeleteBulkListener({} as any, {});
    
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
      
      const messages = new Collection<Snowflake, Message>();
      messages.set('msg1', createMockMessage({ id: 'msg1' } as any));
      
      await listener.run(messages);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should be enabled when listener config is enabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
      
      const messages = new Collection<Snowflake, Message>();
      messages.set('msg1', createMockMessage({ id: 'msg1' } as any));
      
      await listener.run(messages);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filtrage de la collection', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should ignore empty collection', async () => {
      const emptyMessages = new Collection<Snowflake, Message>();
      
      await listener.run(emptyMessages);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should ignore messages not in a guild', async () => {
      const messages = new Collection<Snowflake, Message>();
      const dmMessage = createMockMessage({
        id: 'msg1',
        guild: null,
        guildId: null,
      } as any);
      messages.set('msg1', dmMessage);
      
      await listener.run(messages);
      
      expectNoEventSent(mockEventBatcher);
    });
  });

  describe('Traitement de collection de messages', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should process multiple cached messages correctly', async () => {
      const messages = new Collection<Snowflake, Message>();
      
      const msg1 = createMockMessage({
        id: 'msg1',
        content: 'First message',
        author: { id: 'user1', username: 'User1', bot: false } as any,
      } as any);
      
      const msg2 = createMockMessage({
        id: 'msg2',
        content: 'Second message',
        author: { id: 'user2', username: 'User2', bot: false } as any,
      } as any);
      
      const msg3 = createMockMessage({
        id: 'msg3',
        content: 'Third message',
        author: { id: 'user3', username: 'User3', bot: false } as any,
      } as any);
      
      messages.set('msg1', msg1);
      messages.set('msg2', msg2);
      messages.set('msg3', msg3);
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.count).toBe(3);
          expect(evt.data.messageIds).toHaveLength(3);
          expect(evt.data.messageIds).toContain('msg1');
          expect(evt.data.messageIds).toContain('msg2');
          expect(evt.data.messageIds).toContain('msg3');
          
          expect(evt.data.cachedMessages).toHaveLength(3);
          expect(evt.data.cachedCount).toBe(3);
        }
      );
    });
    
    it('should handle single message deletion', async () => {
      const messages = new Collection<Snowflake, Message>();
      messages.set('msg1', createMockMessage({ id: 'msg1' } as any));
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.count).toBe(1);
          expect(evt.data.messageIds).toHaveLength(1);
        }
      );
    });
    
    it('should handle large bulk deletion (100 messages)', async () => {
      const messages = new Collection<Snowflake, Message>();
      
      for (let i = 0; i < 100; i++) {
        const msg = createMockMessage({
          id: `msg${i}`,
          content: `Message ${i}`,
        } as any);
        messages.set(`msg${i}`, msg);
      }
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.count).toBe(100);
          expect(evt.data.messageIds).toHaveLength(100);
          expect(evt.data.cachedMessages).toHaveLength(100);
        }
      );
    });
  });

  describe('Gestion des partials', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should handle mix of cached and partial messages', async () => {
      const messages = new Collection<Snowflake, Message | PartialMessage>();
      
      // Message complet en cache
      const cachedMsg = createMockMessage({
        id: 'cached1',
        content: 'Cached message',
        author: { id: 'user1', username: 'User1', bot: false } as any,
      } as any);
      
      // Message partial (non en cache)
      const partialMsg = {
        id: 'partial1',
        guildId: 'guild123',
        channelId: 'channel123',
        author: undefined,
        content: undefined,
        channel: {
          type: 0,
          isDMBased: () => false,
          name: 'general',
        } as any,
      } as any;
      
      messages.set('cached1', cachedMsg);
      messages.set('partial1', partialMsg);
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.count).toBe(2);
          expect(evt.data.messageIds).toHaveLength(2);
          
          // Seul le message cached devrait être dans cachedMessages
          expect(evt.data.cachedMessages).toHaveLength(1);
          expect(evt.data.cachedCount).toBe(1);
          expect(evt.data.cachedMessages[0].messageId).toBe('cached1');
        }
      );
    });
    
    it('should handle only partial messages (none cached)', async () => {
      const messages = new Collection<Snowflake, PartialMessage>();
      
      const partial1 = {
        id: 'partial1',
        guildId: 'guild123',
        channelId: 'channel123',
        author: undefined,
        content: undefined,
        channel: {
          type: 0,
          isDMBased: () => false,
        } as any,
      } as any;
      
      const partial2 = {
        id: 'partial2',
        guildId: 'guild123',
        channelId: 'channel123',
        author: undefined,
        content: undefined,
        channel: {
          type: 0,
          isDMBased: () => false,
        } as any,
      } as any;
      
      messages.set('partial1', partial1);
      messages.set('partial2', partial2);
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.count).toBe(2);
          expect(evt.data.messageIds).toHaveLength(2);
          expect(evt.data.cachedMessages).toBeUndefined();
          expect(evt.data.cachedCount).toBe(0);
        }
      );
    });
    
    it('should filter out messages without author or content', async () => {
      const messages = new Collection<Snowflake, Message>();
      
      // Message avec author mais sans content
      const msgNoContent = createMockMessage({
        id: 'msg1',
        content: undefined,
      } as any);
      
      // Message avec content mais sans author
      const msgNoAuthor = createMockMessage({
        id: 'msg2',
        content: 'Some content',
        author: undefined,
      } as any);
      
      // Message complet
      const completeMsg = createMockMessage({
        id: 'msg3',
        content: 'Complete message',
      } as any);
      
      messages.set('msg1', msgNoContent);
      messages.set('msg2', msgNoAuthor);
      messages.set('msg3', completeMsg);
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.count).toBe(3);
          expect(evt.data.messageIds).toHaveLength(3);
          
          // Seul le message complet devrait être dans cachedMessages
          expect(evt.data.cachedMessages).toHaveLength(1);
          expect(evt.data.cachedCount).toBe(1);
          expect(evt.data.cachedMessages[0].messageId).toBe('msg3');
        }
      );
    });
  });

  describe('Extraction des données', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract cached message details correctly', async () => {
      const messages = new Collection<Snowflake, Message>();
      
      const createdAt = new Date('2024-01-15T10:00:00Z');
      const msg = createMockMessage({
        id: 'msg1',
        content: 'Message content',
        author: { id: 'user1', username: 'TestUser', bot: false } as any,
        createdAt,
      } as any);
      
      messages.set('msg1', msg);
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          const cached = evt.data.cachedMessages[0];
          expect(cached.messageId).toBe('msg1');
          expect(cached.authorId).toBe('user1');
          expect(cached.authorUsername).toBe('TestUser');
          expect(cached.content).toBe('Message content');
          expect(cached.createdAt).toEqual(createdAt);
        }
      );
    });
    
    it('should extract channel information', async () => {
      const messages = new Collection<Snowflake, Message>();
      
      const msg = createMockMessage({
        id: 'msg1',
        channelId: 'channel456',
        channel: {
          type: 0,
          name: 'general-chat',
          isDMBased: () => false,
        } as any,
      } as any);
      
      messages.set('msg1', msg);
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.channelId).toBe('channel456');
          expect(evt.data.channelName).toBe('general-chat');
          expect(evt.data.channelType).toBe(0);
          expect(evt.channelId).toBe('channel456');
        }
      );
    });
    
    it('should include deletedAt timestamp', async () => {
      const messages = new Collection<Snowflake, Message>();
      messages.set('msg1', createMockMessage({ id: 'msg1' } as any));
      
      const beforeRun = Date.now();
      await listener.run(messages);
      const afterRun = Date.now();
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.deletedAt).toBeInstanceOf(Date);
          const deletedTime = evt.data.deletedAt.getTime();
          expect(deletedTime).toBeGreaterThanOrEqual(beforeRun);
          expect(deletedTime).toBeLessThanOrEqual(afterRun);
        }
      );
    });
    
    it('should handle messages from different authors', async () => {
      const messages = new Collection<Snowflake, Message>();
      
      const authors = ['user1', 'user2', 'user3', 'user4', 'user5'];
      authors.forEach((userId, index) => {
        const msg = createMockMessage({
          id: `msg${index}`,
          content: `Message from ${userId}`,
          author: { id: userId, username: `User${index}`, bot: false } as any,
        } as any);
        messages.set(`msg${index}`, msg);
      });
      
      await listener.run(messages);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123',
        (evt) => {
          expect(evt.data.cachedMessages).toHaveLength(5);
          
          const authorIds = evt.data.cachedMessages.map((m: any) => m.authorId);
          expect(authorIds).toEqual(expect.arrayContaining(authors));
        }
      );
    });
  });

  describe('Structure de l\'événement BotEventDto', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should create valid BotEventDto structure', async () => {
      const messages = new Collection<Snowflake, Message>();
      messages.set('msg1', createMockMessage({ id: 'msg1' } as any));
      messages.set('msg2', createMockMessage({ id: 'msg2' } as any));
      
      await listener.run(messages);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123'
      );
      
      expect(event).toMatchObject({
        type: EventType.MESSAGE_DELETE_BULK,
        guildId: 'guild123',
        channelId: 'channel123',
        timestamp: expect.any(Number),
        data: expect.any(Object),
      });
      
      // Note: userId n'est pas présent pour MESSAGE_DELETE_BULK
      // car il y a plusieurs users potentiels
      expect(event.userId).toBeUndefined();
      
      const now = Date.now();
      expect(event.timestamp).toBeGreaterThan(now - 1000);
      expect(event.timestamp).toBeLessThanOrEqual(now);
    });
    
    it('should have all required data fields', async () => {
      const messages = new Collection<Snowflake, Message>();
      messages.set('msg1', createMockMessage({ id: 'msg1' } as any));
      
      await listener.run(messages);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE_BULK,
        'guild123'
      );
      
      expect(event.data).toHaveProperty('messageIds');
      expect(event.data).toHaveProperty('count');
      expect(event.data).toHaveProperty('channelId');
      expect(event.data).toHaveProperty('channelName');
      expect(event.data).toHaveProperty('channelType');
      expect(event.data).toHaveProperty('cachedCount');
      expect(event.data).toHaveProperty('deletedAt');
    });
  });
});