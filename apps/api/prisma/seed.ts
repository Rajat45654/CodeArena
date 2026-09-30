import { PrismaClient, Role, Language } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CodeArena database...');

  // 1. Create Default Admin User
  const adminPasswordHash = await argon2.hash('Admin@12345');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codearena.dev' },
    update: {},
    create: {
      email: 'admin@codearena.dev',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Created Admin: ${admin.username} (${admin.email})`);

  // 2. Create Default Test Participant User
  const userPasswordHash = await argon2.hash('User@12345');
  const participant = await prisma.user.upsert({
    where: { email: 'student@college.edu' },
    update: {},
    create: {
      email: 'student@college.edu',
      username: 'student1',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });
  console.log(`Created Participant: ${participant.username} (${participant.email})`);

  // 3. Create Sample Problem: "Two Sum Problem (A + B)"
  const problem = await prisma.problem.upsert({
    where: { slug: 'a-plus-b' },
    update: {},
    create: {
      slug: 'a-plus-b',
      title: 'A + B Problem',
      difficulty: 'EASY',
      statementMd: `## A + B Problem

Calculate the sum of two integers $A$ and $B$.

### Input
The first and only line of input contains two space-separated integers $A$ and $B$ ($-10^9 \\le A, B \\le 10^9$).

### Output
Print a single integer: the sum of $A$ and $B$.

### Sample 1
**Input:**
\`\`\`
1 2
\`\`\`

**Output:**
\`\`\`
3
\`\`\`
`,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      isPublished: true,
      createdById: admin.id,
      testCases: {
        create: [
          {
            ordinal: 1,
            input: '1 2\n',
            expectedOutput: '3\n',
            isSample: true,
          },
          {
            ordinal: 2,
            input: '100 200\n',
            expectedOutput: '300\n',
            isSample: true,
          },
          {
            ordinal: 3,
            input: '-50 50\n',
            expectedOutput: '0\n',
            isSample: false,
          },
          {
            ordinal: 4,
            input: '1000000000 1000000000\n',
            expectedOutput: '2000000000\n',
            isSample: false,
          },
        ],
      },
    },
  });
  console.log(`Created Sample Problem: ${problem.title} (${problem.slug})`);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
