import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';

describe('Problems Integration & Leak Protection (E2E)', () => {
  let app: INestApplication;
  let adminCookie: string;
  let studentCookie: string;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'ready'],
    });

    await app.init();

    // Log in as student
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'student@college.edu', password: 'User@12345' });

    const studentHeaders = studentLogin.headers['set-cookie'];
    studentCookie = Array.isArray(studentHeaders) ? studentHeaders.join('; ') : (studentHeaders || '');

    // Log in as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'admin@codearena.dev', password: 'Admin@12345' });

    const adminHeaders = adminLogin.headers['set-cookie'];
    adminCookie = Array.isArray(adminHeaders) ? adminHeaders.join('; ') : (adminHeaders || '');
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Public Problem Endpoints', () => {
    it('GET /api/v1/problems should list published problems without test cases', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/problems')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);

      // Verify no test cases leaked in listing
      for (const item of res.body.items) {
        expect(item).not.toHaveProperty('testCases');
        expect(item).not.toHaveProperty('sampleTestCases');
      }
    });

    it('GET /api/v1/problems/:slug should return PROVABLY ONLY sample test cases', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/problems/a-plus-b')
        .expect(200);

      expect(res.body.slug).toBe('a-plus-b');
      expect(res.body).toHaveProperty('sampleTestCases');
      expect(res.body).not.toHaveProperty('testCases');

      // Check all returned test cases are samples
      const samples = res.body.sampleTestCases;
      expect(samples.length).toBe(2);
      for (const tc of samples) {
        expect(tc.isSample).toBe(true);
        expect(tc.ordinal).toBeLessThanOrEqual(2);
      }

      // Assert that hidden test cases (ordinal 3 and 4) are strictly absent
      const ordinals = samples.map((tc: any) => tc.ordinal);
      expect(ordinals).not.toContain(3);
      expect(ordinals).not.toContain(4);
    });

    it('GET /api/v1/problems/:slug should return 404 for nonexistent problem', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/problems/non-existent-problem-slug')
        .expect(404);
    });
  });

  describe('Admin RBAC Protection', () => {
    it('POST /api/v1/admin/problems should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/problems')
        .send({
          title: 'Hacker Problem',
          slug: 'hacker-problem',
          statementMd: 'This should fail',
          testCases: [{ ordinal: 1, input: '1', expectedOutput: '1' }],
        })
        .expect(401);
    });

    it('POST /api/v1/admin/problems should reject non-admin users with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/problems')
        .set('Cookie', studentCookie)
        .send({
          title: 'Student Attempt',
          slug: 'student-attempt',
          statementMd: 'Should be forbidden',
          testCases: [{ ordinal: 1, input: '1', expectedOutput: '1' }],
        })
        .expect(403);
    });

    it('POST /api/v1/admin/problems should allow admin to create problem', async () => {
      const slug = `admin-created-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/problems')
        .set('Cookie', adminCookie)
        .send({
          title: 'Admin Problem',
          slug,
          statementMd: 'Created via integration test',
          difficulty: 'MEDIUM',
          isPublished: true,
          testCases: [
            { ordinal: 1, input: '10', expectedOutput: '20', isSample: true },
            { ordinal: 2, input: '30', expectedOutput: '60', isSample: false },
          ],
        })
        .expect(201);

      expect(res.body.slug).toBe(slug);

      // Verify publicly that only the sample test case (ordinal 1) is returned
      const pubRes = await request(app.getHttpServer())
        .get(`/api/v1/problems/${slug}`)
        .expect(200);

      expect(pubRes.body.sampleTestCases).toHaveLength(1);
      expect(pubRes.body.sampleTestCases[0].ordinal).toBe(1);
      expect(pubRes.body.sampleTestCases[0].isSample).toBe(true);
    });
  });
});
