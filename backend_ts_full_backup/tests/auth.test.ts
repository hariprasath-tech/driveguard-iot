import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config/env';
import { closeDb } from '../src/db';

describe('Auth API Integration Tests', () => {
  const { app, alertEngine } = createApp();

  afterAll(() => {
    alertEngine.clear();
    closeDb();
  });

  test('POST /api/auth/login succeeds with seeded admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: config.ADMIN_EMAIL,
        password: config.ADMIN_PASSWORD
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(config.ADMIN_EMAIL);
    expect(res.body.user.role).toBe('admin');
  });

  test('POST /api/auth/login rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: config.ADMIN_EMAIL,
        password: 'wrong_password_123'
      });

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns current user profile when valid token provided', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: config.ADMIN_EMAIL,
        password: config.ADMIN_PASSWORD
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(config.ADMIN_EMAIL);
  });
});
