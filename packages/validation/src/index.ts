import { z } from 'zod';
import { Language } from '@codearena/shared-types';

// ==============================================================================
// Authentication Schemas
// ==============================================================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and dashes'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginSchema>;

// ==============================================================================
// Problem Schemas
// ==============================================================================

export const TestCaseInputSchema = z.object({
  ordinal: z.number().int().min(1),
  input: z.string(),
  expectedOutput: z.string(),
  isSample: z.boolean().default(false),
});

export const CreateProblemSchema = z.object({
  title: z.string().min(3).max(100),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  statementMd: z.string().min(10, 'Problem statement must be at least 10 characters'),
  timeLimitMs: z.number().int().min(200).max(10000).default(2000),
  memoryLimitMb: z.number().int().min(16).max(1024).default(256),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  testCases: z.array(TestCaseInputSchema).min(1, 'At least one testcase is required'),
});

export type CreateProblemDto = z.infer<typeof CreateProblemSchema>;

// ==============================================================================
// Submission Schemas
// ==============================================================================

export const MAX_SOURCE_BYTES = 64 * 1024; // 64 KB limit as per Section 14.2

export const CreateSubmissionSchema = z.object({
  problemId: z.string().uuid('Invalid problem ID format'),
  contestId: z.string().uuid('Invalid contest ID format').optional(),
  language: z.nativeEnum(Language, {
    errorMap: () => ({ message: 'Unsupported programming language' }),
  }),
  sourceCode: z
    .string()
    .min(1, 'Source code cannot be empty')
    .refine(
      (val) => Buffer.byteLength(val, 'utf8') <= MAX_SOURCE_BYTES,
      `Source code exceeds maximum allowed size of ${MAX_SOURCE_BYTES / 1024} KB`
    ),
});

export type CreateSubmissionDto = z.infer<typeof CreateSubmissionSchema>;

// ==============================================================================
// Contest Schemas
// ==============================================================================

export const CreateContestSchema = z
  .object({
    title: z.string().min(3).max(100),
    slug: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().max(2000).optional(),
    startsAt: z.string().datetime({ message: 'startsAt must be a valid ISO timestamp' }),
    endsAt: z.string().datetime({ message: 'endsAt must be a valid ISO timestamp' }),
    freezeAt: z.string().datetime({ message: 'freezeAt must be a valid ISO timestamp' }).optional(),
    penaltyMinutes: z.number().int().min(0).max(120).default(20),
    isPublic: z.boolean().default(true),
    problemIds: z.array(z.string().uuid()).min(1, 'Contest must have at least one problem'),
  })
  .refine(
    (data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(),
    {
      message: 'endsAt must be chronologically after startsAt',
      path: ['endsAt'],
    }
  );

export type CreateContestDto = z.infer<typeof CreateContestSchema>;
