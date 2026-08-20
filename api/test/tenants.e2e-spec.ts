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

describe('Tenants (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and lists a tenant', async () => {
    const createRes = await http(app)
      .post('/tenants')
      .send({ name: 'Nguyen Van A', phone: '0901234567' })
      .expect(201);
    expect(createRes.body).toMatchObject({
      name: 'Nguyen Van A',
      phone: '0901234567',
    });

    const listRes = await http(app).get('/tenants').expect(200);
    expect(listRes.body).toHaveLength(1);
  });

  it('rejects a duplicate identity number', async () => {
    await http(app)
      .post('/tenants')
      .send({ name: 'A', phone: '1', identityNumber: '079123' })
      .expect(201);
    await http(app)
      .post('/tenants')
      .send({ name: 'B', phone: '2', identityNumber: '079123' })
      .expect(409);
  });

  it('rejects a tenant with empty name or phone', async () => {
    await http(app).post('/tenants').send({ name: '', phone: '1' }).expect(400);
    await http(app).post('/tenants').send({ name: 'A', phone: '' }).expect(400);
  });
});
