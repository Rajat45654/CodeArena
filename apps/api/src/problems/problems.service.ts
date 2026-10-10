import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { ProblemQueryDto } from './dto/problem-query.dto';
import { AddTestCaseDto } from './dto/add-test-case.dto';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProblem(dto: CreateProblemDto, adminUserId: string) {
    const existing = await this.prisma.problem.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Problem with slug "${dto.slug}" already exists`);
    }

    // Ensure test case ordinals are unique within the submission
    const ordinals = dto.testCases.map((tc) => tc.ordinal);
    const uniqueOrdinals = new Set(ordinals);
    if (uniqueOrdinals.size !== ordinals.length) {
      throw new BadRequestException('Test cases must have unique ordinal values');
    }

    return this.prisma.$transaction(async (tx) => {
      const problem = await tx.problem.create({
        data: {
          title: dto.title,
          slug: dto.slug,
          statementMd: dto.statementMd,
          timeLimitMs: dto.timeLimitMs ?? 2000,
          memoryLimitMb: dto.memoryLimitMb ?? 256,
          difficulty: dto.difficulty,
          isPublished: dto.isPublished ?? false,
          createdById: adminUserId,
        },
      });

      if (dto.testCases && dto.testCases.length > 0) {
        await tx.testCase.createMany({
          data: dto.testCases.map((tc) => ({
            problemId: problem.id,
            ordinal: tc.ordinal,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample ?? false,
          })),
        });
      }

      return tx.problem.findUnique({
        where: { id: problem.id },
        include: { testCases: true },
      });
    });
  }

  async findAllPublic(query: ProblemQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isPublished: true,
    };

    if (query.difficulty) {
      where.difficulty = query.difficulty.toUpperCase();
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { statementMd: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, problems] = await Promise.all([
      this.prisma.problem.count({ where }),
      this.prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          timeLimitMs: true,
          memoryLimitMb: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      items: problems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlugPublic(slug: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { slug },
      include: {
        testCases: {
          where: { isSample: true },
          orderBy: { ordinal: 'asc' },
          select: {
            ordinal: true,
            input: true,
            expectedOutput: true,
            isSample: true,
          },
        },
      },
    });

    if (!problem || !problem.isPublished) {
      throw new NotFoundException(`Problem "${slug}" not found`);
    }

    return {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      statementMd: problem.statementMd,
      difficulty: problem.difficulty,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      createdAt: problem.createdAt,
      sampleTestCases: problem.testCases,
    };
  }

  async findAllAdmin(query: ProblemQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.difficulty) {
      where.difficulty = query.difficulty.toUpperCase();
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, problems] = await Promise.all([
      this.prisma.problem.count({ where }),
      this.prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { testCases: true, submissions: true },
          },
        },
      }),
    ]);

    return {
      items: problems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdAdmin(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { ordinal: 'asc' },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Problem with ID "${id}" not found`);
    }

    return problem;
  }

  async updateProblem(id: string, dto: UpdateProblemDto) {
    const existing = await this.prisma.problem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Problem with ID "${id}" not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugTaken = await this.prisma.problem.findUnique({
        where: { slug: dto.slug },
      });
      if (slugTaken) {
        throw new ConflictException(`Problem with slug "${dto.slug}" already exists`);
      }
    }

    return this.prisma.problem.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.statementMd !== undefined && { statementMd: dto.statementMd }),
        ...(dto.timeLimitMs !== undefined && { timeLimitMs: dto.timeLimitMs }),
        ...(dto.memoryLimitMb !== undefined && { memoryLimitMb: dto.memoryLimitMb }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: {
        testCases: {
          orderBy: { ordinal: 'asc' },
        },
      },
    });
  }

  async deleteProblem(id: string) {
    const existing = await this.prisma.problem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Problem with ID "${id}" not found`);
    }

    await this.prisma.problem.delete({
      where: { id },
    });

    return { message: 'Problem deleted successfully' };
  }

  async togglePublish(id: string, isPublished: boolean) {
    const existing = await this.prisma.problem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Problem with ID "${id}" not found`);
    }

    return this.prisma.problem.update({
      where: { id },
      data: { isPublished },
    });
  }

  async addTestCase(problemId: string, dto: AddTestCaseDto) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      throw new NotFoundException(`Problem with ID "${problemId}" not found`);
    }

    const existingOrdinal = await this.prisma.testCase.findUnique({
      where: {
        problemId_ordinal: {
          problemId,
          ordinal: dto.ordinal,
        },
      },
    });

    if (existingOrdinal) {
      throw new ConflictException(
        `Test case with ordinal ${dto.ordinal} already exists for this problem`,
      );
    }

    return this.prisma.testCase.create({
      data: {
        problemId,
        ordinal: dto.ordinal,
        input: dto.input,
        expectedOutput: dto.expectedOutput,
        isSample: dto.isSample ?? false,
      },
    });
  }

  async deleteTestCase(problemId: string, testCaseId: string) {
    const testCase = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        problemId,
      },
    });

    if (!testCase) {
      throw new NotFoundException(`Test case not found`);
    }

    await this.prisma.testCase.delete({
      where: { id: testCaseId },
    });

    return { message: 'Test case deleted successfully' };
  }

  // Internal method for judge pipeline to fetch all test cases
  async getTestCasesForJudge(problemId: string) {
    return this.prisma.testCase.findMany({
      where: { problemId },
      orderBy: { ordinal: 'asc' },
    });
  }
}
