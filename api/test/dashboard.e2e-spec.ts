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

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let contractId: string;
  let roomId: string;

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
      .send({ name: 'Tenant', phone: '0901' })
      .expect(201);
    const contract = await http(app)
      .post('/contracts')
      .send({ roomId: room.body.id, tenantId: tenant.body.id, startsAt: '2026-08-01T00:00:00.000Z', deposit: 0 })
      .expect(201);

    roomId = room.body.id;
    contractId = contract.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns room and contract stats', async () => {
    const stats = await http(app).get('/dashboard').expect(200);
    expect(stats.body).toMatchObject({
      totalRooms: 1,
      occupiedRooms: 1,
      vacantRooms: 0,
      occupancyRate: 100,
      activeContracts: 1,
    });
  });

  it('counts PAID invoices as revenue', async () => {
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 100, water: 50 })
      .expect(201);
    const invoice = await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(201);
    await http(app)
      .post(`/invoices/${invoice.body.id}/issue`)
      .expect(201);
    await http(app)
      .post(`/invoices/${invoice.body.id}/pay`)
      .expect(201);

    const stats = await http(app).get('/dashboard').expect(200);
    expect(stats.body.paidInvoices).toBe(1);
    expect(stats.body.totalRevenue).toBe(3000000 + 100 * 3500 + 50 * 30000); // 3M + 350k + 1.5M = 4,850,000
  });
});
