-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('CPP17', 'PYTHON3', 'JAVA17');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('QUEUED', 'COMPILING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'INTERNAL_ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statementMd" TEXT NOT NULL,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 256,
    "difficulty" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "penaltyMinutes" INTEGER NOT NULL DEFAULT 20,
    "freezeAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_problems" (
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,

    CONSTRAINT "contest_problems_pkey" PRIMARY KEY ("contestId","problemId")
);

-- CreateTable
CREATE TABLE "contest_participants" (
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_participants_pkey" PRIMARY KEY ("contestId","userId")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "contestId" TEXT,
    "language" "Language" NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "failedTestOrdinal" INTEGER,
    "timeMs" INTEGER,
    "memoryKb" INTEGER,
    "compileOutput" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "judgedAt" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_test_results" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "testOrdinal" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "timeMs" INTEGER,
    "memoryKb" INTEGER,

    CONSTRAINT "submission_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_problem_results" (
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "wrongAttempts" INTEGER NOT NULL DEFAULT 0,
    "solvedAtMinutes" INTEGER,
    "solvedAt" TIMESTAMP(3),

    CONSTRAINT "contest_problem_results_pkey" PRIMARY KEY ("contestId","userId","problemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "problems_slug_key" ON "problems"("slug");

-- CreateIndex
CREATE INDEX "test_cases_problemId_idx" ON "test_cases"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "test_cases_problemId_ordinal_key" ON "test_cases"("problemId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "contests_slug_key" ON "contests"("slug");

-- CreateIndex
CREATE INDEX "contests_startsAt_endsAt_idx" ON "contests"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "contest_problems_contestId_idx" ON "contest_problems"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "contest_problems_contestId_label_key" ON "contest_problems"("contestId", "label");

-- CreateIndex
CREATE INDEX "contest_participants_contestId_idx" ON "contest_participants"("contestId");

-- CreateIndex
CREATE INDEX "contest_participants_userId_idx" ON "contest_participants"("userId");

-- CreateIndex
CREATE INDEX "submissions_userId_createdAt_idx" ON "submissions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "submissions_contestId_createdAt_idx" ON "submissions"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "submissions_problemId_status_idx" ON "submissions"("problemId", "status");

-- CreateIndex
CREATE INDEX "submissions_status_createdAt_idx" ON "submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "submission_test_results_submissionId_idx" ON "submission_test_results"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_test_results_submissionId_testOrdinal_key" ON "submission_test_results"("submissionId", "testOrdinal");

-- CreateIndex
CREATE INDEX "contest_problem_results_contestId_userId_idx" ON "contest_problem_results"("contestId", "userId");

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_test_results" ADD CONSTRAINT "submission_test_results_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_problem_results" ADD CONSTRAINT "contest_problem_results_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
