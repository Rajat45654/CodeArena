import { Test, TestingModule } from '@nestjs/testing';
import { ProblemsService } from './problems.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('ProblemsService', () => {
  let service: ProblemsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      problem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      testCase: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProblemsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProblemsService>(ProblemsService);
  });

  describe('createProblem', () => {
    it('should create a problem with testcases in a transaction', async () => {
      prisma.problem.findUnique.mockResolvedValueOnce(null); // slug check
      prisma.problem.create.mockResolvedValueOnce({
        id: 'p-1',
        title: 'Two Sum',
        slug: 'two-sum',
      });
      prisma.testCase.createMany.mockResolvedValueOnce({ count: 2 });
      prisma.problem.findUnique.mockResolvedValueOnce({
        id: 'p-1',
        title: 'Two Sum',
        slug: 'two-sum',
        testCases: [{ id: 'tc-1', ordinal: 1, isSample: true }],
      });

      const result = await service.createProblem(
        {
          title: 'Two Sum',
          slug: 'two-sum',
          statementMd: 'Find two numbers...',
          testCases: [
            { ordinal: 1, input: '1 2', expectedOutput: '3', isSample: true },
            { ordinal: 2, input: '4 5', expectedOutput: '9', isSample: false },
          ],
        },
        'admin-user-id',
      );

      expect(prisma.problem.create).toHaveBeenCalled();
      expect(prisma.testCase.createMany).toHaveBeenCalled();
      expect(result.id).toBe('p-1');
    });

    it('should throw ConflictException if slug already exists', async () => {
      prisma.problem.findUnique.mockResolvedValueOnce({ id: 'p-existing' });

      await expect(
        service.createProblem(
          {
            title: 'Two Sum',
            slug: 'two-sum',
            statementMd: '...',
            testCases: [{ ordinal: 1, input: '1', expectedOutput: '1' }],
          },
          'admin-user-id',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if test case ordinals are duplicate', async () => {
      prisma.problem.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createProblem(
          {
            title: 'Two Sum',
            slug: 'two-sum',
            statementMd: '...',
            testCases: [
              { ordinal: 1, input: '1', expectedOutput: '1' },
              { ordinal: 1, input: '2', expectedOutput: '2' },
            ],
          },
          'admin-user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllPublic', () => {
    it('should only query published problems and not expose test cases', async () => {
      prisma.problem.count.mockResolvedValue(1);
      prisma.problem.findMany.mockResolvedValue([
        {
          id: 'p-1',
          slug: 'two-sum',
          title: 'Two Sum',
          difficulty: 'EASY',
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          createdAt: new Date(),
        },
      ]);

      const result = await service.findAllPublic({ page: 1, limit: 10 });

      expect(prisma.problem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublished: true }),
        }),
      );
      expect(result.items[0]).not.toHaveProperty('testCases');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findBySlugPublic - Hidden Test Case Leak Protection', () => {
    it('should PROVABLY NEVER return hidden test cases on public endpoint', async () => {
      // Problem has 1 sample test case and 2 hidden test cases
      // Prisma mock verifies that Prisma query filters { where: { isSample: true } }
      prisma.problem.findUnique.mockImplementation(({ include }: any) => {
        // Assert that the query specifies isSample: true in where clause
        expect(include.testCases.where).toEqual({ isSample: true });

        return Promise.resolve({
          id: 'p-1',
          slug: 'two-sum',
          title: 'Two Sum',
          statementMd: 'Solve this...',
          difficulty: 'EASY',
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          isPublished: true,
          createdAt: new Date(),
          testCases: [
            {
              ordinal: 1,
              input: '1 2\n',
              expectedOutput: '3\n',
              isSample: true,
            },
          ],
        });
      });

      const result = await service.findBySlugPublic('two-sum');

      expect(result.sampleTestCases).toHaveLength(1);
      expect(result.sampleTestCases[0].isSample).toBe(true);
      // Hidden testcases are not in result
      expect(result).not.toHaveProperty('testCases');
      expect(result.sampleTestCases.every((tc: any) => tc.isSample === true)).toBe(true);
    });

    it('should throw NotFoundException if problem is not published', async () => {
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-1',
        slug: 'draft-problem',
        isPublished: false,
        testCases: [],
      });

      await expect(service.findBySlugPublic('draft-problem')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if problem does not exist', async () => {
      prisma.problem.findUnique.mockResolvedValue(null);

      await expect(service.findBySlugPublic('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllAdmin and findByIdAdmin', () => {
    it('should return all problems including drafts for admin', async () => {
      prisma.problem.count.mockResolvedValue(2);
      prisma.problem.findMany.mockResolvedValue([
        { id: 'p-1', isPublished: true },
        { id: 'p-2', isPublished: false },
      ]);

      const result = await service.findAllAdmin({});
      expect(result.items).toHaveLength(2);
    });

    it('should return all test cases including hidden for admin by id', async () => {
      prisma.problem.findUnique.mockResolvedValue({
        id: 'p-1',
        title: 'Two Sum',
        testCases: [
          { id: 'tc-1', ordinal: 1, isSample: true },
          { id: 'tc-2', ordinal: 2, isSample: false }, // hidden
        ],
      });

      const result = await service.findByIdAdmin('p-1');
      expect(result.testCases).toHaveLength(2);
      expect(result.testCases[1].isSample).toBe(false);
    });
  });

  describe('updateProblem & deleteProblem', () => {
    it('should update problem details', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p-1', slug: 'two-sum' });
      prisma.problem.update.mockResolvedValue({ id: 'p-1', title: 'New Title' });

      const result = await service.updateProblem('p-1', { title: 'New Title' });
      expect(result.title).toBe('New Title');
    });

    it('should delete problem successfully', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.problem.delete.mockResolvedValue({ id: 'p-1' });

      const result = await service.deleteProblem('p-1');
      expect(result.message).toBe('Problem deleted successfully');
    });
  });

  describe('test case operations', () => {
    it('should add a single test case', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.testCase.findUnique.mockResolvedValue(null);
      prisma.testCase.create.mockResolvedValue({ id: 'tc-1', ordinal: 1 });

      const result = await service.addTestCase('p-1', {
        ordinal: 1,
        input: '1',
        expectedOutput: '1',
        isSample: false,
      });
      expect(result.id).toBe('tc-1');
    });

    it('should add a batch of test cases', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'p-1' });
      prisma.testCase.findMany.mockResolvedValue([]);
      prisma.testCase.createMany.mockResolvedValue({ count: 2 });

      const result = await service.addTestCasesBatch('p-1', [
        { ordinal: 1, input: '1', expectedOutput: '1' },
        { ordinal: 2, input: '2', expectedOutput: '2' },
      ]);
      expect(result.count).toBe(2);
    });

    it('should update a test case', async () => {
      prisma.testCase.findFirst.mockResolvedValue({ id: 'tc-1', ordinal: 1 });
      prisma.testCase.update.mockResolvedValue({ id: 'tc-1', input: 'new input' });

      const result = await service.updateTestCase('p-1', 'tc-1', { input: 'new input' });
      expect(result.input).toBe('new input');
    });

    it('should delete a test case', async () => {
      prisma.testCase.findFirst.mockResolvedValue({ id: 'tc-1' });
      prisma.testCase.delete.mockResolvedValue({ id: 'tc-1' });

      const result = await service.deleteTestCase('p-1', 'tc-1');
      expect(result.message).toBe('Test case deleted successfully');
    });
  });
});
