import { MessageDeleteListener } from '../../../../src/listeners/messages/messageDelete';
import { EventType } from '@my-project/shared-types';
import { 
  setupTestContainer, 
  expectEventSent, 
  expectNoEventSent 
} from '../../../helpers/testHelpers';
import { 
  createMockMessage,
  createMockMessageWithAttachments,
  createMockBotMessage
} from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('MessageDeleteListener', () => {
  let listener: MessageDeleteListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new MessageDeleteListener({} as any, {});
    
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
      
      const mockMessage = createMockMessage();
      
      await listener.run(mockMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should be enabled when listener config is enabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
      
      const mockMessage = createMockMessage();
      
      await listener.run(mockMessage);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filtrage des messages', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should ignore messages from bots', async () => {
      const botMessage = createMockBotMessage();
      
      await listener.run(botMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should ignore messages not in a guild (DMs)', async () => {
      const dmMessage = createMockMessage({
        guild: null,
        guildId: null,
      } as any);
      
      await listener.run(dmMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
  });

  describe('Gestion des partials', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should handle partial message (not in cache)', async () => {
      const partialMessage = {
        id: 'msg123',
        partial: true,
        guildId: 'guild123',
        channelId: 'channel123',
        author: undefined,
        content: undefined,
        attachments: undefined,
        embeds: undefined,
        channel: {
          type: 0,
          isDMBased: () => false,
        } as any,
      } as any;
      
      await listener.run(partialMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.authorId).toBe('unknown');
          expect(evt.data.authorUsername).toBe('Unknown User');
          expect(evt.data.content).toBeUndefined();
          expect(evt.data.hasAttachments).toBe(false);
        }
      );
    });
    
    it('should handle message with no author (very old cached message)', async () => {
      const messageWithoutAuthor = createMockMessage({
        author: undefined,
      } as any);
      
      await listener.run(messageWithoutAuthor);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.authorId).toBe('unknown');
          expect(evt.data.authorUsername).toBe('Unknown User');
        }
      );
    });
    
    it('should handle message with no attachments property', async () => {
      const messageWithoutAttachments = createMockMessage({
        attachments: undefined,
      } as any);
      
      await listener.run(messageWithoutAttachments);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.hasAttachments).toBe(false);
          expect(evt.data.attachmentCount).toBe(0);
          expect(evt.data.attachments).toBeUndefined();
        }
      );
    });
    
    it('should handle message with no embeds property', async () => {
      const messageWithoutEmbeds = createMockMessage({
        embeds: undefined,
      } as any);
      
      await listener.run(messageWithoutEmbeds);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.hasEmbeds).toBe(false);
          expect(evt.data.embedCount).toBe(0);
        }
      );
    });
    
    it('should handle message with no channel property', async () => {
      const messageWithoutChannel = createMockMessage({
        channel: undefined,
      } as any);
      
      await listener.run(messageWithoutChannel);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.channelName).toBe('Unknown');
        }
      );
    });
  });

  describe('Extraction des données du message', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract basic message data correctly when cached', async () => {
      const mockMessage = createMockMessage({
        id: 'msg123',
        content: 'This message was deleted',
        author: {
          id: 'author456',
          username: 'JohnDoe',
          bot: false,
        } as any,
        guildId: 'guild789',
        channelId: 'channel101',
      } as any);
      
      await listener.run(mockMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild789',
        (evt) => {
          expect(evt.data.content).toBe('This message was deleted');
          expect(evt.data.authorId).toBe('author456');
          expect(evt.data.authorUsername).toBe('JohnDoe');
          expect(evt.data.authorBot).toBe(false);
          expect(evt.channelId).toBe('channel101');
          expect(evt.messageId).toBe('msg123');
          expect(evt.data.deletedAt).toBeInstanceOf(Date);
        }
      );
    });
    
    it('should extract message with attachments correctly', async () => {
      const messageWithAttachments = createMockMessageWithAttachments(3, {
        id: 'msg_with_att',
        content: 'Message with files',
      } as any);
      
      await listener.run(messageWithAttachments);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.hasAttachments).toBe(true);
          expect(evt.data.attachmentCount).toBe(3);
          expect(evt.data.attachments).toHaveLength(3);
          
          expect(evt.data.attachments[0]).toMatchObject({
            id: 'attachment1',
            filename: 'image1.png',
            size: 1024,
            contentType: 'image/png',
          });
        }
      );
    });
    
    it('should handle message with empty content', async () => {
      const messageWithEmptyContent = createMockMessage({
        content: '',
      } as any);
      
      await listener.run(messageWithEmptyContent);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.content).toBeUndefined();
        }
      );
    });
    
    it('should extract createdAt timestamp', async () => {
      const createdAt = new Date('2024-01-15T10:30:00Z');
      const mockMessage = createMockMessage({
        createdAt,
      } as any);
      
      await listener.run(mockMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123',
        (evt) => {
          expect(evt.data.createdAt).toEqual(createdAt);
          expect(evt.data.deletedAt).toBeInstanceOf(Date);
          // Le deletedAt devrait être après le createdAt
          expect(evt.data.deletedAt.getTime()).toBeGreaterThan(createdAt.getTime());
        }
      );
    });
  });

  describe('Structure de l\'événement BotEventDto', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should create valid BotEventDto structure', async () => {
      const mockMessage = createMockMessage();
      
      await listener.run(mockMessage);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123'
      );
      
      expect(event).toMatchObject({
        type: EventType.MESSAGE_DELETE,
        guildId: 'guild123',
        userId: 'user123',
        channelId: 'channel123',
        messageId: '123456789012345678',
        timestamp: expect.any(Number),
        data: expect.any(Object),
      });
      
      const now = Date.now();
      expect(event.timestamp).toBeGreaterThan(now - 1000);
      expect(event.timestamp).toBeLessThanOrEqual(now);
    });
    
    it('should handle userId being unknown for partial messages', async () => {
      const partialMessage = {
        id: 'msg123',
        guildId: 'guild123',
        channelId: 'channel123',
        author: undefined,
        channel: {
          type: 0,
          isDMBased: () => false,
        } as any,
      } as any;
      
      await listener.run(partialMessage);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_DELETE,
        'guild123'
      );
      
      expect(event.userId).toBe('unknown');
    });
  });
});