import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  createOwnerUser,
  getPrisma,
  http,
  resetDatabase,
  OWNER_AUTH_USER_ID,
  OWNER_EMAIL,
} from './setup-e2e';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/me returns the authenticated user', async () => {
    const res = await http(app).get('/auth/me').expect(200);
    expect(res.body).toMatchObject({
      authUserId: OWNER_AUTH_USER_ID,
      email: OWNER_EMAIL,
      role: 'OWNER',
    });
  });

  it('POST /auth/bootstrap provisions the user as OWNER', async () => {
    const res = await http(app).post('/auth/bootstrap').expect(201);
    expect(res.body).toMatchObject({
      authUserId: OWNER_AUTH_USER_ID,
      email: OWNER_EMAIL,
      role: 'OWNER',
    });
  });
});
