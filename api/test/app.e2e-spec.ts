import { INestApplication } from '@nestjs/common';
import { createTestApp, http } from './setup-e2e';

describe('App /health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const res = await http(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
