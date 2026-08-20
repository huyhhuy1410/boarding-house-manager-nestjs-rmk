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

describe('Contracts (e2e)', () => {
  let app: INestApplication;
  let roomId: string;
  let tenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);
    const house = await http(app)
      .post('/boarding-houses')
      .send({ name: 'House', address: 'Addr' })
      .expect(201);
    const room = await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId: house.body.id })
      .expect(201);
    const tenant = await http(app)
      .post('/tenants')
      .send({ name: 'Nguyen Van A', phone: '0901' })
      .expect(201);
    roomId = room.body.id;
    tenantId = tenant.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a contract and marks the room occupied', async () => {
    const contract = await http(app)
      .post('/contracts')
      .send({ roomId, tenantId, startsAt: '2026-08-01T00:00:00.000Z', deposit: 1000000 })
      .expect(201);
    expect(contract.body).toMatchObject({ status: 'ACTIVE' });

    const roomRes = await http(app).get(`/rooms/${roomId}`).expect(200);
    expect(roomRes.body.status).toBe('OCCUPIED');
  });

  it('rejects a second active contract on the same room', async () => {
    await http(app)
      .post('/contracts')
      .send({ roomId, tenantId, startsAt: '2026-08-01T00:00:00.000Z', deposit: 0 })
      .expect(201);
    await http(app)
      .post('/contracts')
      .send({ roomId, tenantId, startsAt: '2026-09-01T00:00:00.000Z', deposit: 0 })
      .expect(409);
  });

  it('ends a contract and frees the room', async () => {
    const contract = await http(app)
      .post('/contracts')
      .send({ roomId, tenantId, startsAt: '2026-08-01T00:00:00.000Z', deposit: 0 })
      .expect(201);

    const endRes = await http(app)
      .post(`/contracts/${contract.body.id}/end`)
      .expect(200);
    expect(endRes.body).toMatchObject({ status: 'ENDED' });

    const roomRes = await http(app).get(`/rooms/${roomId}`).expect(200);
    expect(roomRes.body.status).toBe('VACANT');
  });

  it('rejects a contract with invalid date', async () => {
    await http(app)
      .post('/contracts')
      .send({ roomId, tenantId, startsAt: 'not-a-date', deposit: 0 })
      .expect(400);
  });
});
