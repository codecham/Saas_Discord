import { container } from '@sapphire/framework';
import { EventBatcher } from '../../src/services/eventBatcher.service';
import { WebSocketService } from '../../src/services/websocket.service';
import { BotEventDto, EventType } from '@my-project/shared-types';


declare module '@sapphire/pieces' {
  interface Container {
    ws: WebSocketService;
    eventBatcher: EventBatcher;
  }
}

/**
 * Configure le container Sapphire avec des mocks pour les tests
 * 
 * @returns Les mocks créés pour pouvoir les tester
 */
export function setupTestContainer() {
  // Mock de l'EventBatcher
  const mockEventBatcher = {
    addEvent: jest.fn().mockResolvedValue(undefined),
    flushBatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EventBatcher>;

  // Mock du WebSocketService (si nécessaire)
  const mockWebSocket = {
    sendToBackend: jest.fn().mockResolvedValue(undefined),
    isConnected: true,
  };

  // Injection dans le container
  container.eventBatcher = mockEventBatcher;
  container.ws = mockWebSocket as any;

  return { 
    mockEventBatcher, 
    mockWebSocket ,
    container
  };
}

/**
 * Vérifie qu'un événement a bien été envoyé au batcher avec les bonnes données
 */
export function expectEventSent(
  mockBatcher: jest.Mocked<EventBatcher>,
  expectedType: EventType,
  expectedGuildId: string,
  validate?: (event: BotEventDto) => void
): BotEventDto {
  expect(mockBatcher.addEvent).toHaveBeenCalled();
  
  const calls = mockBatcher.addEvent.mock.calls;
  const lastCall = calls[calls.length - 1];
  const event = lastCall[0] as BotEventDto;
  
  expect(event).toBeDefined();
  expect(event.type).toBe(expectedType);
  expect(event.guildId).toBe(expectedGuildId);
  expect(event.timestamp).toBeDefined();
  expect(typeof event.timestamp).toBe('number');
  
  if (validate) {
    validate(event);
  }
  
  return event;
}

/**
 * Vérifie qu'AUCUN événement n'a été envoyé
 */
export function expectNoEventSent(mockBatcher: jest.Mocked<EventBatcher>) {
  expect(mockBatcher.addEvent).not.toHaveBeenCalled();
}

/**
 * Récupère tous les événements envoyés au batcher
 */
export function getAllSentEvents(mockBatcher: jest.Mocked<EventBatcher>): BotEventDto[] {
  return mockBatcher.addEvent.mock.calls.map(call => call[0] as BotEventDto);
}

/**
 * Compte le nombre d'événements d'un type spécifique envoyés
 */
export function countEventsByType(
  mockBatcher: jest.Mocked<EventBatcher>, 
  eventType: EventType
): number {
  const allEvents = getAllSentEvents(mockBatcher);
  return allEvents.filter(e => e.type === eventType).length;
}

/**
 * Reset tous les mocks du container
 */
export function resetContainerMocks() {
  if (container.eventBatcher) {
    (container.eventBatcher.addEvent as jest.Mock).mockClear();
  }
}