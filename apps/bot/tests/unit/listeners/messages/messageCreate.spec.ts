// apps/bot/tests/unit/listeners/messages/messageCreate.spec.ts

import { MessageCreateListener } from '../../../../src/listeners/messages/messageCreate';
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
  createMockMessageWithEmbeds,
  createMockBotMessage,
  createMockSystemMessage,
  createMockReplyMessage
} from '../../../helpers/mockFactory';
import * as listenersConfig from '../../../../src/config/listeners.config';

describe('MessageCreateListener', () => {
  let listener: MessageCreateListener;
  let mockEventBatcher: any;
  
  beforeEach(() => {
    // Setup du container avec les mocks
    const setup = setupTestContainer();
    mockEventBatcher = setup.mockEventBatcher;
    
    // Créer l'instance du listener
    listener = new MessageCreateListener({} as any, {});
    
    // Mocker le container en forçant le remplacement
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
      // Mock: désactiver le listener
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(false);
      
      const mockMessage = createMockMessage();
      
      await listener.run(mockMessage);
      
      // Vérifier qu'aucun event n'a été envoyé
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should be enabled when listener config is enabled', async () => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
      
      const mockMessage = createMockMessage();
      
      await listener.run(mockMessage);
      
      // Vérifier qu'un event a été envoyé
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
    
    it('should ignore system messages (UserJoin)', async () => {
      const systemMessage = createMockSystemMessage(MessageType.UserJoin);
      
      await listener.run(systemMessage);
      
      expectNoEventSent(mockEventBatcher);
    });
    
    it('should accept Default message type', async () => {
      const normalMessage = createMockMessage({
        type: MessageType.Default
      } as any);
      
      await listener.run(normalMessage);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalled();
    });
    
    it('should accept Reply message type', async () => {
      const replyMessage = createMockReplyMessage();
      
      await listener.run(replyMessage);
      
      expect(mockEventBatcher.addEvent).toHaveBeenCalled();
    });
  });

  describe('Extraction des données du message', () => {
    beforeEach(() => {
      jest.spyOn(listenersConfig, 'isListenerEnabled').mockReturnValue(true);
    });

    it('should extract basic message data correctly', async () => {
      const mockMessage = createMockMessage({
        id: 'msg123',
        content: 'Hello world!',
        author: {
          id: 'author456',
          username: 'JohnDoe',
          discriminator: '1234',
          bot: false,
          tag: 'JohnDoe#1234',
        } as any,
        guildId: 'guild789',
        channelId: 'channel101',
      } as any);
      
      await listener.run(mockMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_CREATE,
        'guild789',
        (evt) => {
          expect(evt.data.content).toBe('Hello world!');
          expect(evt.data.authorId).toBe('author456');
          expect(evt.data.authorUsername).toBe('JohnDoe');
          expect(evt.data.authorBot).toBe(false);
          expect(evt.channelId).toBe('channel101');
          expect(evt.messageId).toBe('msg123');
        }
      );
    });
    
    it('should extract message with attachments correctly', async () => {
      const messageWithAttachments = createMockMessageWithAttachments(2, {
        id: 'msg_with_att',
        content: 'Check these images!',
       } as any);
      
      await listener.run(messageWithAttachments);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_CREATE,
        'guild123',
        (evt) => {
          expect(evt.data.hasAttachments).toBe(true);
          expect(evt.data.attachmentCount).toBe(2);
          expect(evt.data.attachments).toHaveLength(2);
          
          // Vérifier le premier attachment
          expect(evt.data.attachments[0]).toMatchObject({
            id: 'attachment1',
            filename: 'image1.png',
            size: 1024,
            contentType: 'image/png',
          });
        }
      );
    });
    
    it('should extract message with embeds correctly', async () => {
      const messageWithEmbeds = createMockMessageWithEmbeds(2, {
        id: 'msg_with_embeds',
      } as any);
      
      await listener.run(messageWithEmbeds);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_CREATE,
        'guild123',
        (evt) => {
          expect(evt.data.hasEmbeds).toBe(true);
          expect(evt.data.embedCount).toBe(2);
        }
      );
    });
    
    it('should handle messages without attachments or embeds', async () => {
      const simpleMessage = createMockMessage({
        content: 'Simple text message',
      } as any);
      
      await listener.run(simpleMessage);
      
      expectEventSent(
        mockEventBatcher,
        EventType.MESSAGE_CREATE,
        'guild123',
        (evt) => {
          expect(evt.data.hasAttachments).toBe(false);
          expect(evt.data.attachmentCount).toBe(0);
          expect(evt.data.hasEmbeds).toBe(false);
          expect(evt.data.embedCount).toBe(0);
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
        EventType.MESSAGE_CREATE,
        'guild123'
      );
      
      // Vérifier la structure complète
      expect(event).toMatchObject({
        type: EventType.MESSAGE_CREATE,
        guildId: 'guild123',
        userId: 'user123',
        channelId: 'channel123',
        messageId: '123456789012345678',
        timestamp: expect.any(Number),
        data: expect.any(Object),
      });
      
      // Vérifier que le timestamp est récent
      const now = Date.now();
      expect(event.timestamp).toBeGreaterThan(now - 1000);
      expect(event.timestamp).toBeLessThanOrEqual(now);
    });
  });
});