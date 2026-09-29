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

describe('Maintenance requests (e2e)', () => {
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
      .send({ name: 'Tenant', phone: '0901' })
      .expect(201);
    await http(app)
      .post('/contracts')
      .send({
        roomId: room.body.id,
        tenantId: tenant.body.id,
        startsAt: '2026-08-01T00:00:00.000Z',
        deposit: 0,
      })
      .expect(201);

    roomId = room.body.id;
    tenantId = tenant.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the full lifecycle OPEN -> IN_PROGRESS -> RESOLVED', async () => {
    const created = await http(app)
      .post('/maintenance-requests')
      .send({ roomId, tenantId, title: 'Broken faucet', description: 'Leaks' })
      .expect(201);
    expect(created.body.status).toBe('OPEN');

    // create() does not include the tenant relation; verify the link via findOne
    const fetched = await http(app)
      .get(`/maintenance-requests/${created.body.id}`)
      .expect(200);
    expect(fetched.body.tenant).toMatchObject({ id: tenantId });

    const started = await http(app)
      .patch(`/maintenance-requests/${created.body.id}/start`)
      .expect(200);
    expect(started.body.status).toBe('IN_PROGRESS');

    const resolved = await http(app)
      .patch(`/maintenance-requests/${created.body.id}/resolve`)
      .send({ chargeTo: 'OWNER', actualCost: 150000 })
      .expect(200);
    expect(resolved.body.status).toBe('RESOLVED');
  });

  it('creates an Expense when resolved with chargeTo OWNER and actualCost > 0', async () => {
    // The one place the system creates an Expense by itself. Asserting the
    // link back to the request is what proves the auto-create ran, not that
    // someone could have created an expense through the API.
    const created = await http(app)
      .post('/maintenance-requests')
      .send({ roomId, tenantId, title: 'Fix', description: 'Desc' })
      .expect(201);
    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/start`)
      .expect(200);
    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/resolve`)
      .send({ chargeTo: 'OWNER', actualCost: 150000 })
      .expect(200);

    const expenses = await http(app).get('/expenses').expect(200);
    expect(expenses.body).toHaveLength(1);
    expect(expenses.body[0]).toMatchObject({
      category: 'MAINTENANCE',
      amount: 150000,
      maintenanceRequestId: created.body.id,
    });
  });

  it('rejects a second resolve (atomic double-resolve guard)', async () => {
    const created = await http(app)
      .post('/maintenance-requests')
      .send({ roomId, tenantId, title: 'Fix', description: 'Desc' })
      .expect(201);
    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/start`)
      .expect(200);

    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/resolve`)
      .send({ chargeTo: 'OWNER', actualCost: 100000 })
      .expect(200);
    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/resolve`)
      .send({ chargeTo: 'OWNER', actualCost: 100000 })
      .expect(409);

    // only ONE expense was created despite two resolve attempts
    const expenses = await http(app).get('/expenses').expect(200);
    expect(expenses.body).toHaveLength(1);
  });

  it('rejects chargeTo TENANT when the request has no tenant', async () => {
    // A request with no tenant is a vacant room. Accepting TENANT there would
    // record a charge against nobody, so it is rejected inside the same
    // transaction that would have committed the transition.
    const created = await http(app)
      .post('/maintenance-requests')
      .send({ roomId, title: 'Fix', description: 'No tenant' })
      .expect(201);
    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/start`)
      .expect(200);
    await http(app)
      .patch(`/maintenance-requests/${created.body.id}/resolve`)
      .send({ chargeTo: 'TENANT', actualCost: 100000 })
      .expect(409);
  });

  it('cancels an OPEN request', async () => {
    const created = await http(app)
      .post('/maintenance-requests')
      .send({ roomId, tenantId, title: 'Fix', description: 'Desc' })
      .expect(201);
    const cancelled = await http(app)
      .patch(`/maintenance-requests/${created.body.id}/cancel`)
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
  });
});
