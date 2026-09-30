// ==============================================================================
// CodeArena Core Shared Types & Enums
// ==============================================================================

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum Language {
  CPP17 = 'CPP17',
  PYTHON3 = 'PYTHON3',
  JAVA17 = 'JAVA17',
}

export enum SubmissionStatus {
  QUEUED = 'QUEUED',
  COMPILING = 'COMPILING',
  RUNNING = 'RUNNING',
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR', // system fault, never counted as a penalty
}

export enum ContestLifecycle {
  UPCOMING = 'UPCOMING',
  RUNNING = 'RUNNING',
  ENDED = 'ENDED',
}

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  role: Role;
}

export interface AuthResponse {
  user: UserSummary;
  accessToken: string;
}

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty?: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  isPublished: boolean;
  createdAt: string;
}

export interface ProblemDetail extends ProblemSummary {
  statementMd: string;
  sampleTestCases: SampleTestCase[];
}

export interface SampleTestCase {
  ordinal: number;
  input: string;
  expectedOutput: string;
}

export interface SubmissionPayload {
  problemId: string;
  contestId?: string;
  language: Language;
  sourceCode: string;
}

export interface SubmissionSummary {
  id: string;
  userId: string;
  problemId: string;
  contestId?: string | null;
  language: Language;
  status: SubmissionStatus;
  failedTestOrdinal?: number | null;
  timeMs?: number | null;
  memoryKb?: number | null;
  compileOutput?: string | null;
  createdAt: string;
  judgedAt?: string | null;
}

export interface SubmissionDetail extends SubmissionSummary {
  sourceCode: string;
  testResults: SubmissionTestResultItem[];
}

export interface SubmissionTestResultItem {
  id: string;
  testOrdinal: number;
  status: SubmissionStatus;
  timeMs?: number | null;
  memoryKb?: number | null;
}

export interface ContestSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  freezeAt?: string | null;
  penaltyMinutes: number;
  isPublic: boolean;
  isRegistered?: boolean;
  status: ContestLifecycle;
}

export interface ContestProblemItem {
  label: string;
  ordinal: number;
  problem: ProblemSummary;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  rank: number;
  score: number;
  solvedCount: number;
  totalPenaltyMinutes: number;
  lastSolvedAt?: string | null;
  problemResults: Record<string, {
    solved: boolean;
    wrongAttempts: number;
    solvedAtMinutes?: number | null;
    pending?: boolean;
  }>;
}

// Queue Job Payload
export interface JudgeJobData {
  submissionId: string;
}

// WebSocket Event Names & Payloads
export const WS_EVENTS = {
  SUBMISSION_UPDATED: 'submission.updated',
  LEADERBOARD_UPDATED: 'leaderboard.updated',
  CONTEST_STARTED: 'contest.started',
  CONTEST_ENDED: 'contest.ended',
} as const;

export interface SubmissionUpdatedEvent {
  submissionId: string;
  status: SubmissionStatus;
  failedTestOrdinal?: number | null;
  timeMs?: number | null;
  memoryKb?: number | null;
  compileOutput?: string | null;
}

export interface LeaderboardUpdatedEvent {
  contestId: string;
  changedUserId: string;
}

export interface ContestLifecycleEvent {
  contestId: string;
}
