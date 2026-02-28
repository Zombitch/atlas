import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

// E2E tests require a running MongoDB instance.
// These tests validate the full flow: workspace creation, upload, sharing, download.
// To run: ensure MONGODB_URI is set and run `npm run test:e2e`

describe('Atlas E2E (requires MongoDB)', () => {
  // Placeholder - E2E tests require a live MongoDB connection
  // Uncomment and configure when MongoDB is available

  it('should be defined', () => {
    expect(true).toBe(true);
  });

  /*
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let ownerSecret: string;
  let workspaceId: string;

  it('POST /api/workspaces - should create a workspace', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/workspaces')
      .send({ name: 'Test Workspace' })
      .expect(201);

    expect(res.body.workspaceId).toBeDefined();
    expect(res.body.ownerSecret).toBeDefined();
    expect(res.body.ownerSecret.length).toBeGreaterThanOrEqual(64);

    ownerSecret = res.body.ownerSecret;
    workspaceId = res.body.workspaceId;
  });

  it('POST /api/access - should verify owner secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/access')
      .send({ secret: ownerSecret })
      .expect(200);

    expect(res.body.type).toBe('owner');
    expect(res.body.workspaceId).toBe(workspaceId);
  });

  it('POST /api/access - should reject invalid secret', async () => {
    await request(app.getHttpServer())
      .post('/api/access')
      .send({ secret: 'invalid-secret-that-does-not-exist' })
      .expect(403);
  });

  it('POST /api/upload - should upload a file with owner secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/upload')
      .field('workspaceId', workspaceId)
      .field('secret', ownerSecret)
      .attach('file', Buffer.from('Hello World'), 'test.txt')
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.originalName).toBe('test.txt');
  });

  it('POST /api/shares - should create a share secret', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shares')
      .send({
        secret: ownerSecret,
        workspaceId,
        scopeType: 'WORKSPACE',
        scopeId: workspaceId,
      })
      .expect(201);

    expect(res.body.secret).toBeDefined();
    expect(res.body.shareId).toBeDefined();
  });

  it('POST /api/download/verify - should reject download without valid secret', async () => {
    await request(app.getHttpServer())
      .post('/api/download/verify')
      .send({ documentId: 'some-id', secret: 'invalid' })
      .expect(403);
  });
  */
});
