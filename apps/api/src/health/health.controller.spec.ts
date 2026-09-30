import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let healthController: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  describe('getLiveness', () => {
    it('should return status ok and service name', () => {
      const result = healthController.getLiveness();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('codearena-api');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReadiness', () => {
    it('should return ready when database is reachable', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '1': 1 }]);

      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      const mockRes: any = { status: mockStatus };

      await healthController.getReadiness(mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          checks: { database: 'ok' },
        }),
      );
    });

    it('should return unhealthy when database is unreachable', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('DB unreachable'));

      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      const mockRes: any = { status: mockStatus };

      await healthController.getReadiness(mockRes);

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          checks: { database: 'failed' },
        }),
      );
    });
  });
});
