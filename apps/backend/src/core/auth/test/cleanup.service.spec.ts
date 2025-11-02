/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from '../services/cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    refreshToken: {
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupExpiredRefreshTokens', () => {
    it('should delete expired refresh tokens', async () => {
      // Arrange
      const mockResult = { count: 5 };
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue(mockResult);

      // Act
      const result = await service.cleanupExpiredRefreshTokens();

      // Assert
      expect(result).toBe(5);

      // Vérifier que deleteMany a été appelé
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledTimes(1);

      // Vérifier la structure de l'appel
      const callArgs =
        mockPrismaService.refreshToken.deleteMany.mock.calls[0][0];
      expect(callArgs).toBeDefined();
      expect(callArgs.where).toBeDefined();
      expect(callArgs.where.expiresAt).toBeDefined();
      expect(callArgs.where.expiresAt.lt).toBeInstanceOf(Date);
    });

    it('should return 0 when no expired tokens found', async () => {
      // Arrange
      const mockResult = { count: 0 };
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue(mockResult);

      // Act
      const result = await service.cleanupExpiredRefreshTokens();

      // Assert
      expect(result).toBe(0);
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('should throw error when database operation fails', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      mockPrismaService.refreshToken.deleteMany.mockRejectedValue(mockError);

      // Act & Assert
      try {
        await service.cleanupExpiredRefreshTokens();
        // Si on arrive ici, le test échoue
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Database connection failed');
      }
    });
  });

  describe('countExpiredRefreshTokens', () => {
    it('should count expired refresh tokens', async () => {
      // Arrange
      mockPrismaService.refreshToken.count.mockResolvedValue(3);

      // Act
      const result = await service.countExpiredRefreshTokens();

      // Assert
      expect(result).toBe(3);

      // Vérifier que count a été appelé
      expect(prismaService.refreshToken.count).toHaveBeenCalledTimes(1);

      // Vérifier la structure de l'appel
      const callArgs = mockPrismaService.refreshToken.count.mock.calls[0][0];
      expect(callArgs).toBeDefined();
      expect(callArgs.where).toBeDefined();
      expect(callArgs.where.expiresAt).toBeDefined();
      expect(callArgs.where.expiresAt.lt).toBeInstanceOf(Date);
    });

    it('should return 0 when no expired tokens', async () => {
      // Arrange
      mockPrismaService.refreshToken.count.mockResolvedValue(0);

      // Act
      const result = await service.countExpiredRefreshTokens();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('cleanupUserRefreshTokens', () => {
    it('should delete all refresh tokens for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockResult = { count: 2 };
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue(mockResult);

      // Act
      const result = await service.cleanupUserRefreshTokens(userId);

      // Assert
      expect(result).toBe(2);
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should throw error when deletion fails', async () => {
      // Arrange
      const userId = 'user-123';
      const mockError = new Error('Deletion failed');
      mockPrismaService.refreshToken.deleteMany.mockRejectedValue(mockError);

      // Act & Assert
      try {
        await service.cleanupUserRefreshTokens(userId);
        // Si on arrive ici, le test échoue
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Deletion failed');
      }
    });
  });

  describe('getRefreshTokenStats', () => {
    it('should return correct statistics', async () => {
      // Arrange
      mockPrismaService.refreshToken.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // expired

      // Act
      const result = await service.getRefreshTokenStats();

      // Assert
      expect(result).toEqual({
        total: 10,
        expired: 3,
        active: 7,
      });
      expect(prismaService.refreshToken.count).toHaveBeenCalledTimes(2);
    });

    it('should handle zero tokens', async () => {
      // Arrange
      mockPrismaService.refreshToken.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0); // expired

      // Act
      const result = await service.getRefreshTokenStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        expired: 0,
        active: 0,
      });
    });

    it('should handle all expired tokens', async () => {
      // Arrange
      mockPrismaService.refreshToken.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(5); // expired

      // Act
      const result = await service.getRefreshTokenStats();

      // Assert
      expect(result).toEqual({
        total: 5,
        expired: 5,
        active: 0,
      });
    });
  });
});
