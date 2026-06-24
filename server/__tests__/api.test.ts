import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../article-scraper', () => ({
  fetchFullContent: vi.fn(),
  clusterNews: vi.fn(),
}));

import { registerRoutes } from '../routes';

const app = express();
app.use(express.json());

describe('API Health & Basic Auth', () => {
  let server: any;

  beforeAll(async () => {
    server = await registerRoutes(app);
  });

  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/auth/login with invalid data should return 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid email address');
  });

  it('POST /api/auth/register with short password should return 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        email: 'test@example.com', 
        password: 'short',
        displayName: 'Test User'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Password must be at least 8 characters');
  });
});
