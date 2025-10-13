import { MessageUpdateListener } from '../../../../src/listeners/messages/messageUpdate';
import { EventType } from '@my-project/shared-types';
import { MessageType } from 'discord.js';
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

describe('MessageUpdateListener', () => {
  let listener: MessageUpdateListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    listener = new MessageUpdateListener({} as any, {});
    
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
      
      const oldMessage = createMockMessage({ content: 'Old content' } as any);
      const newMessage = createMockMessage({ content: 'New content' } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should be enabled when listener config is enabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
      
      const oldMessage = createMockMessage({ content: 'Old content' } as any);
      const newMessage = createMockMessage({ content: 'New content' } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filtrage des messages', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should ignore messages from bots', async () => {
      const botMessage = createMockBotMessage();
      
      await listener.run(botMessage, botMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should ignore messages not in a guild (DMs)', async () => {
      const dmMessage = createMockMessage({
        guild: null,
        guildId: null,
      } as any);
      
      await listener.run(dmMessage, dmMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
  });

  describe('Gestion des partials', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should handle partial newMessage by fetching it', async () => {
      const oldMessage = createMockMessage({ content: 'Old content' } as any);
      
      const partialNewMessage = {
        id: 'msg123',
        partial: true,
        fetch: jest.fn().mockResolvedValue(
          createMockMessage({ 
            id: 'msg123',
            content: 'New content',
            editedAt: new Date()
          } as any)
        ),
      } as any;
      
      await listener.run(oldMessage, partialNewMessage);
      
      expect(partialNewMessage.fetch).toHaveBeenCalled();
      expect(mockEventBatcher.addEvent).toHaveBeenCalled();
    });
    
    it('should handle fetch failure gracefully', async () => {
      const oldMessage = createMockMessage({ content: 'Old content' } as any);
      
      const partialNewMessage = {
        id: 'msg123',
        partial: true,
        fetch: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      } as any;
      
      await listener.run(oldMessage, partialNewMessage);
      
      expect(partialNewMessage.fetch).toHaveBeenCalled();
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should handle oldMessage being a partial (no oldContent)', async () => {
      const oldPartialMessage = {
        id: 'msg123',
        partial: true,
        content: undefined,
        author: { id: 'user123', username: 'User', bot: false } as any,
        guildId: 'guild123',
      } as any;
      
      const newMessage = createMockMessage({ 
        id: 'msg123',
        content: 'New content',
        editedAt: new Date()
      } as any);
      
      await listener.run(oldPartialMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.oldContent).toBeUndefined();
          expect(evt.data.newContent).toBe('New content');
        }
      );
    });
  });

  describe('Extraction des données du message', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract content changes correctly', async () => {
      const editedAt = new Date();
      const createdAt = new Date(Date.now() - 60000); // 1 minute ago
      
      const oldMessage = createMockMessage({
        id: 'msg123',
        content: 'Original text',
        createdAt,
      } as any);
      
      const newMessage = createMockMessage({
        id: 'msg123',
        content: 'Edited text',
        editedAt,
        createdAt,
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.oldContent).toBe('Original text');
          expect(evt.data.newContent).toBe('Edited text');
          expect(evt.data.editedAt).toEqual(editedAt);
          expect(evt.data.originalCreatedAt).toEqual(createdAt);
        }
      );
    });
    
    it('should extract author data correctly', async () => {
      const oldMessage = createMockMessage({
        content: 'Old',
        author: {
          id: 'author789',
          username: 'JaneDoe',
          bot: false,
        } as any,
      } as any);
      
      const newMessage = createMockMessage({
        content: 'New',
        author: {
          id: 'author789',
          username: 'JaneDoe',
          bot: false,
        } as any,
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.authorId).toBe('author789');
          expect(evt.data.authorUsername).toBe('JaneDoe');
          expect(evt.data.authorBot).toBe(false);
        }
      );
    });
    
    it('should extract attachments correctly', async () => {
      const oldMessage = createMockMessage({ content: 'Old' } as any);
      const newMessage = createMockMessageWithAttachments(2, {
        content: 'New with attachments',
        editedAt: new Date(),
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.hasAttachments).toBe(true);
          expect(evt.data.attachmentCount).toBe(2);
          expect(evt.data.attachments).toHaveLength(2);
        }
      );
    });
    
    it('should handle message with no content change', async () => {
      const oldMessage = createMockMessage({ 
        content: 'Same content',
      } as any);
      
      const newMessage = createMockMessage({ 
        content: 'Same content',
        editedAt: new Date(),
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.oldContent).toBe('Same content');
          expect(evt.data.newContent).toBe('Same content');
        }
      );
    });
    
    it('should handle message with empty new content', async () => {
      const oldMessage = createMockMessage({ 
        content: 'Original text',
      } as any);
      
      const newMessage = createMockMessage({ 
        content: '',
        editedAt: new Date(),
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123',
        (evt) => {
          expect(evt.data.oldContent).toBe('Original text');
          expect(evt.data.newContent).toBe('');
        }
      );
    });
  });

  describe('Structure de l\'événement BotEventDto', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should create valid BotEventDto structure', async () => {
      const oldMessage = createMockMessage({ content: 'Old' } as any);
      const newMessage = createMockMessage({ 
        content: 'New',
        editedAt: new Date(),
      } as any);
      
      await listener.run(oldMessage, newMessage);
      
      const event = expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_UPDATE,
        'guild123'
      );
      
      expect(event).toMatchObject({
        type: EventType.MESSAGE_UPDATE,
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
  });
});