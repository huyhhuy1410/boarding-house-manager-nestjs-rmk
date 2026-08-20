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

describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let contractId: string;
  let roomId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);

    // house with rent 3,000,000; electricity unit 3500; water unit 30000
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

    // previous month + current month readings
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an invoice with RENT + ELECTRICITY + WATER items', async () => {
    const invoice = await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(201);

    expect(invoice.body.status).toBe('DRAFT');
    expect(invoice.body.total).toBe(3000000 + 50 * 3500 + 20 * 30000); // 3M + 175k + 600k = 3,775,000
    const itemTypes = invoice.body.items.map((i: { type: string }) => i.type).sort();
    expect(itemTypes).toEqual(['ELECTRICITY', 'RENT', 'WATER']);
  });

  it('issues and pays an invoice', async () => {
    const invoice = await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(201);

    const issued = await http(app)
      .post(`/invoices/${invoice.body.id}/issue`)
      .expect(201);
    expect(issued.body.status).toBe('ISSUED');
    expect(issued.body.dueAt).toBeDefined();

    const paid = await http(app)
      .post(`/invoices/${invoice.body.id}/pay`)
      .expect(201);
    expect(paid.body.status).toBe('PAID');
    expect(paid.body.paidAt).toBeDefined();
  });

  it('rejects a duplicate invoice for the same period', async () => {
    await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(201);
    await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(409);
  });

  it('rejects invoice with invalid month', async () => {
    await http(app)
      .post('/invoices')
      .send({ contractId, month: 13, year: 2026 })
      .expect(400);
  });

  it('rejects paying a draft invoice', async () => {
    const invoice = await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(201);
    // issue first, then pay is valid; paying DRAFT directly is not routed.
    // The DRAFT->pay path is guarded by service (NotFoundException).
    await http(app)
      .post(`/invoices/${invoice.body.id}/pay`)
      .expect(404);
  });
});
