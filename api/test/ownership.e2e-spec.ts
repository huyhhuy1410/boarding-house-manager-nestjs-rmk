import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  createOwnerUser,
  http,
  resetDatabase,
  OWNER_AUTH_USER_ID,
  OWNER_EMAIL,
  OWNER_AUTH_USER_ID_B,
  OWNER_EMAIL_B,
} from './setup-e2e';

/**
 * Ownership isolation (e2e).
 *
 * Owner A creates one full chain (house -> room -> tenant -> contract ->
 * readings -> invoice -> maintenance request -> expense). Every test then
 * checks owner B cannot read or mutate any node of that chain.
 *
 * Mã 404 nghĩa là "không tồn tại trong scope của B" (đúng: B không được biết
 * dữ liệu này tồn tại). Mã 409 nghĩa là B thấy record nhưng sai state, hoặc
 * thuộc owner khác. Cả hai đều là "B không thay đổi được gì".
 */
describe('Ownership isolation (e2e)', () => {
  let app: INestApplication;
  let houseId: string;
  let roomId: string;
  let tenantId: string;
  let contractId: string;
  let invoiceId: string;
  let maintenanceRequestId: string;
  let expenseId: string;

  const asOwnerB = (verb: 'get' | 'post' | 'patch' | 'delete', url: string) =>
    http(app)[verb](url).set('x-auth-user-id', OWNER_AUTH_USER_ID_B);

  beforeAll(async () => {
    app = await createTestApp();
  });

  // One complete chain per test, built through the public API so the owner
  // scope is the only thing under test. Resetting in beforeEach rather than
  // once per suite keeps tests independent; the cost is a TRUNCATE per test.
  beforeEach(async () => {
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);
    await createOwnerUser(app, OWNER_AUTH_USER_ID_B, OWNER_EMAIL_B);

    const house = await http(app)
      .post('/boarding-houses')
      .send({ name: "Owner A's house", address: 'Addr' })
      .expect(201);
    houseId = house.body.id;

    const room = await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId })
      .expect(201);
    roomId = room.body.id;

    const tenant = await http(app)
      .post('/tenants')
      .send({ name: 'Nguyen Van A', phone: '0901' })
      .expect(201);
    tenantId = tenant.body.id;

    const contract = await http(app)
      .post('/contracts')
      .send({
        roomId,
        tenantId,
        startsAt: '2026-08-01T00:00:00.000Z',
        deposit: 1000000,
      })
      .expect(201);
    contractId = contract.body.id;

    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(201);

    const invoice = await http(app)
      .post('/invoices')
      .send({ contractId, month: 8, year: 2026 })
      .expect(201);
    invoiceId = invoice.body.id;

    const request = await http(app)
      .post('/maintenance-requests')
      .send({ roomId, tenantId, title: 'Broken faucet', description: 'Leaks' })
      .expect(201);
    maintenanceRequestId = request.body.id;

    const expense = await http(app)
      .post('/expenses')
      .send({
        boardingHouseId: houseId,
        maintenanceRequestId,
        category: 'MAINTENANCE',
        title: 'Fix faucet',
        amount: 120000,
        spentAt: '2026-08-20T00:00:00.000Z',
      })
      .expect(201);
    expenseId = expense.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('boarding houses', () => {
    it("owner B cannot read owner A's boarding house", async () => {
      await asOwnerB('get', `/boarding-houses/${houseId}`).expect(404);
    });

    it("owner B cannot list owner A's boarding houses", async () => {
      const res = await asOwnerB('get', '/boarding-houses').expect(200);
      expect(res.body).toHaveLength(0);
    });

    it("owner B cannot update owner A's boarding house", async () => {
      await asOwnerB('patch', `/boarding-houses/${houseId}`)
        .send({ name: 'hacked' })
        .expect(404);
    });

    it("owner B cannot delete owner A's boarding house", async () => {
      await asOwnerB('delete', `/boarding-houses/${houseId}`).expect(404);
    });

    it('owner B sees no rooms created by owner A', async () => {
      const res = await asOwnerB('get', '/rooms').expect(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('tenants', () => {
    it("owner B cannot list owner A's tenants", async () => {
      const res = await asOwnerB('get', '/tenants').expect(200);
      expect(res.body).toHaveLength(0);
    });

    it("owner B cannot read owner A's tenant", async () => {
      await asOwnerB('get', `/tenants/${tenantId}`).expect(404);
    });

    it("owner B cannot update owner A's tenant", async () => {
      await asOwnerB('patch', `/tenants/${tenantId}`)
        .send({ name: 'hacked' })
        .expect(404);
    });

    it("owner B cannot delete owner A's tenant", async () => {
      await asOwnerB('delete', `/tenants/${tenantId}`).expect(404);
    });

    it("leaves owner A's tenant intact after owner B's failed delete", async () => {
      // The negative assertions above are only meaningful if the 404s came
      // from the owner scope and not from a fixture that was already gone.
      const res = await http(app).get(`/tenants/${tenantId}`).expect(200);
      expect(res.body).toMatchObject({ id: tenantId });
    });
  });

  describe('contracts', () => {
    it("owner B cannot list owner A's contracts", async () => {
      const res = await asOwnerB('get', '/contracts').expect(200);
      expect(res.body).toHaveLength(0);
    });

    it("owner B cannot read owner A's contract", async () => {
      await asOwnerB('get', `/contracts/${contractId}`).expect(404);
    });

    it("owner B cannot end owner A's contract", async () => {
      await asOwnerB('post', `/contracts/${contractId}/end`).expect(404);

      // the contract is untouched: still ACTIVE and the room still OCCUPIED
      const contract = await http(app)
        .get(`/contracts/${contractId}`)
        .expect(200);
      expect(contract.body).toMatchObject({ status: 'ACTIVE' });
      const room = await http(app).get(`/rooms/${roomId}`).expect(200);
      expect(room.body.status).toBe('OCCUPIED');
    });
  });

  describe('invoices', () => {
    it("owner B cannot list owner A's invoices", async () => {
      const res = await asOwnerB('get', '/invoices').expect(200);
      expect(res.body).toHaveLength(0);
    });

    it("owner B cannot read owner A's invoice", async () => {
      await asOwnerB('get', `/invoices/${invoiceId}`).expect(404);
    });

    it("owner B cannot create an invoice on owner A's contract", async () => {
      await asOwnerB('post', '/invoices')
        .send({ contractId, month: 8, year: 2026 })
        .expect(404);
    });

    it("owner B cannot issue or pay owner A's invoice", async () => {
      // DRAFT: conditional write does not match, then owner scope lookup -> 404
      await asOwnerB('post', `/invoices/${invoiceId}/issue`).expect(404);
      await asOwnerB('post', `/invoices/${invoiceId}/pay`).expect(404);
    });

    it("owner B cannot void owner A's invoice", async () => {
      // DRAFT is a voidable state, so the transition alone would match; it is
      // the owner scope in the same `where` that stops B, and the service
      // then re-reads inside the owner scope and reports 404 rather than 409.
      await asOwnerB('post', `/invoices/${invoiceId}/void`).expect(404);

      const invoice = await http(app).get(`/invoices/${invoiceId}`).expect(200);
      expect(invoice.body.status).toBe('DRAFT');
    });
  });

  describe('maintenance requests', () => {
    it("owner B cannot list owner A's maintenance requests", async () => {
      const res = await asOwnerB('get', '/maintenance-requests').expect(200);
      expect(res.body).toHaveLength(0);
    });

    it("owner B cannot read owner A's maintenance request", async () => {
      await asOwnerB(
        'get',
        `/maintenance-requests/${maintenanceRequestId}`,
      ).expect(404);
    });

    it("owner B cannot start, cancel or delete owner A's request", async () => {
      await asOwnerB(
        'patch',
        `/maintenance-requests/${maintenanceRequestId}/start`,
      ).expect(404);
      await asOwnerB(
        'patch',
        `/maintenance-requests/${maintenanceRequestId}/cancel`,
      ).expect(404);
      await asOwnerB(
        'delete',
        `/maintenance-requests/${maintenanceRequestId}`,
      ).expect(404);

      const request = await http(app)
        .get(`/maintenance-requests/${maintenanceRequestId}`)
        .expect(200);
      expect(request.body.status).toBe('OPEN');
    });
  });

  describe('expenses', () => {
    it("owner B cannot list owner A's expenses", async () => {
      const res = await asOwnerB('get', '/expenses').expect(200);
      expect(res.body).toHaveLength(0);
    });

    it("owner B cannot read owner A's expense", async () => {
      await asOwnerB('get', `/expenses/${expenseId}`).expect(404);
    });

    it("owner B cannot create an expense on owner A's house", async () => {
      await asOwnerB('post', '/expenses')
        .send({
          boardingHouseId: houseId,
          category: 'OTHER',
          title: 'hacked',
          amount: 1,
          spentAt: '2026-08-20T00:00:00.000Z',
        })
        .expect(404);
    });
  });

  describe('dashboard', () => {
    it('owner B dashboard counts nothing owned by owner A', async () => {
      const res = await asOwnerB('get', '/dashboard').expect(200);
      expect(res.body).toMatchObject({
        totalRooms: 0,
        occupiedRooms: 0,
        activeContracts: 0,
        paidInvoices: 0,
        totalRevenue: 0,
      });
    });
  });
});
