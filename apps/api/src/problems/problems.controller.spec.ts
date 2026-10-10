import { Test, TestingModule } from '@nestjs/testing';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';

describe('ProblemsController', () => {
  let controller: ProblemsController;
  let service: jest.Mocked<Partial<ProblemsService>>;

  beforeEach(async () => {
    service = {
      findAllPublic: jest.fn(),
      findBySlugPublic: jest.fn(),
      createProblem: jest.fn(),
      findAllAdmin: jest.fn(),
      findByIdAdmin: jest.fn(),
      updateProblem: jest.fn(),
      deleteProblem: jest.fn(),
      togglePublish: jest.fn(),
      addTestCase: jest.fn(),
      addTestCasesBatch: jest.fn(),
      updateTestCase: jest.fn(),
      deleteTestCase: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProblemsController],
      providers: [{ provide: ProblemsService, useValue: service }],
    }).compile();

    controller = module.get<ProblemsController>(ProblemsController);
  });

  describe('getPublicProblems', () => {
    it('should return paginated list of published problems', async () => {
      const mockResult = {
        items: [{ id: 'p-1', slug: 'two-sum', title: 'Two Sum' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      (service.findAllPublic as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.getPublicProblems({ page: 1 });
      expect(service.findAllPublic).toHaveBeenCalledWith({ page: 1 });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPublicProblemBySlug', () => {
    it('should return problem with sample test cases only', async () => {
      const mockResult = {
        id: 'p-1',
        slug: 'two-sum',
        title: 'Two Sum',
        statementMd: '...',
        sampleTestCases: [{ ordinal: 1, input: '1', expectedOutput: '1', isSample: true }],
      };
      (service.findBySlugPublic as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.getPublicProblemBySlug('two-sum');
      expect(service.findBySlugPublic).toHaveBeenCalledWith('two-sum');
      expect(result).toEqual(mockResult);
    });
  });

  describe('createProblem', () => {
    it('should pass admin user id and dto to service', async () => {
      const dto = {
        title: 'Two Sum',
        slug: 'two-sum',
        statementMd: '...',
        testCases: [{ ordinal: 1, input: '1', expectedOutput: '1', isSample: true }],
      };
      const mockUser = { id: 'admin-1' };
      (service.createProblem as jest.Mock).mockResolvedValue({ id: 'p-1', ...dto });

      const result = await controller.createProblem(dto as any, mockUser);
      expect(service.createProblem).toHaveBeenCalledWith(dto, 'admin-1');
      expect(result.id).toBe('p-1');
    });
  });

  describe('admin operations', () => {
    it('should call findAllAdmin for admin list', async () => {
      (service.findAllAdmin as jest.Mock).mockResolvedValue({ items: [], total: 0 });
      await controller.getAdminProblems({});
      expect(service.findAllAdmin).toHaveBeenCalledWith({});
    });

    it('should call findByIdAdmin for admin problem details', async () => {
      (service.findByIdAdmin as jest.Mock).mockResolvedValue({ id: 'p-1' });
      await controller.getAdminProblemById('p-1');
      expect(service.findByIdAdmin).toHaveBeenCalledWith('p-1');
    });

    it('should call updateProblem for admin update', async () => {
      (service.updateProblem as jest.Mock).mockResolvedValue({ id: 'p-1', title: 'New' });
      await controller.updateProblem('p-1', { title: 'New' });
      expect(service.updateProblem).toHaveBeenCalledWith('p-1', { title: 'New' });
    });

    it('should call deleteProblem for admin delete', async () => {
      (service.deleteProblem as jest.Mock).mockResolvedValue({ message: 'Deleted' });
      const result = await controller.deleteProblem('p-1');
      expect(service.deleteProblem).toHaveBeenCalledWith('p-1');
      expect(result.message).toBe('Deleted');
    });

    it('should add test case via admin', async () => {
      const tcDto = { ordinal: 1, input: '1', expectedOutput: '1', isSample: false };
      (service.addTestCase as jest.Mock).mockResolvedValue({ id: 'tc-1', ...tcDto });
      const result = await controller.addTestCase('p-1', tcDto);
      expect(service.addTestCase).toHaveBeenCalledWith('p-1', tcDto);
      expect(result.id).toBe('tc-1');
    });

    it('should add batch test cases via admin', async () => {
      const tcBatch = [{ ordinal: 1, input: '1', expectedOutput: '1' }];
      (service.addTestCasesBatch as jest.Mock).mockResolvedValue({ count: 1 });
      const result = await controller.addTestCasesBatch('p-1', { testCases: tcBatch as any });
      expect(service.addTestCasesBatch).toHaveBeenCalledWith('p-1', tcBatch);
      expect(result.count).toBe(1);
    });

    it('should update test case via admin', async () => {
      (service.updateTestCase as jest.Mock).mockResolvedValue({ id: 'tc-1', ordinal: 2 });
      const result = await controller.updateTestCase('p-1', 'tc-1', { ordinal: 2 });
      expect(service.updateTestCase).toHaveBeenCalledWith('p-1', 'tc-1', { ordinal: 2 });
      expect(result.id).toBe('tc-1');
    });

    it('should delete test case via admin', async () => {
      (service.deleteTestCase as jest.Mock).mockResolvedValue({ message: 'Deleted' });
      const result = await controller.deleteTestCase('p-1', 'tc-1');
      expect(service.deleteTestCase).toHaveBeenCalledWith('p-1', 'tc-1');
      expect(result.message).toBe('Deleted');
    });
  });
});
