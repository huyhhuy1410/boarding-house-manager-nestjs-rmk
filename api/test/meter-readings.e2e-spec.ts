/**
 * Meter readings (e2e).
 *
 * Covers the parts of this feature that unit tests cannot reach for real:
 * the P2002 -> 409 mapping (a genuine unique violation on
 * `@@unique([roomId, month, year])`) and ownership scoping through the room
 * -> house -> owner chain.
 */
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

describe('Meter readings (e2e)', () => {
  let app: INestApplication;
  let houseId: string;
  let roomId: string;

  const asOwnerB = (verb: 'get' | 'post', url: string) =>
    // Identity is chosen by header in TestAuthGuard, so impersonating owner B
    // is just a different header on the same in-process app.
    http(app)[verb](url).set('x-auth-user-id', OWNER_AUTH_USER_ID_B);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);
    await createOwnerUser(app, OWNER_AUTH_USER_ID_B, OWNER_EMAIL_B);

    const house = await http(app)
      .post('/boarding-houses')
      .send({ name: 'House', address: 'Addr' })
      .expect(201);
    const room = await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId: house.body.id })
      .expect(201);

    houseId = house.body.id;
    roomId = room.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a reading and lists it for the room, newest period first', async () => {
    const july = await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);
    expect(july.body).toMatchObject({
      roomId,
      month: 7,
      year: 2026,
      electricity: 100,
      water: 50,
    });

    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(201);

    const list = await http(app)
      .get(`/meter-readings?roomId=${roomId}`)
      .expect(200);
    expect(list.body).toHaveLength(2);
    // orderBy year desc, month desc
    expect(list.body[0]).toMatchObject({ month: 8 });
    expect(list.body[1]).toMatchObject({ month: 7 });
  });

  it('filters the list by month and year', async () => {
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(201);

    const list = await http(app)
      .get(`/meter-readings?roomId=${roomId}&month=8&year=2026`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ month: 8 });
  });

  it('rejects a duplicate reading for the same room and period (P2002 -> 409)', async () => {
    const payload = {
      roomId,
      month: 8,
      year: 2026,
      electricity: 150,
      water: 70,
    };
    await http(app).post('/meter-readings').send(payload).expect(201);
    const res = await http(app)
      .post('/meter-readings')
      .send(payload)
      .expect(409);
    expect(res.body.message).toBe(
      'A meter reading already exists for this room and period.',
    );
  });

  it('rejects an electricity reading lower than the previous one', async () => {
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);

    const res = await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 99, water: 70 })
      .expect(400);
    expect(res.body.message).toBe(
      'New meter readings cannot be lower than the previous readings.',
    );
  });

  it('rejects a water reading lower than the previous one', async () => {
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);

    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 49 })
      .expect(400);
  });

  it('accepts an equal reading (the meter did not move)', async () => {
    // The rule is strictly "cannot be lower", so a flat month is valid and
    // produces zero usage on the invoice.
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 7, year: 2026, electricity: 100, water: 50 })
      .expect(201);
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 100, water: 50 })
      .expect(201);
  });

  it('rejects a reading for a room outside the owner scope (404)', async () => {
    const res = await asOwnerB('post', '/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(404);
    expect(res.body.message).toBe('Room not found.');
  });

  it('does not let owner B read owner A readings', async () => {
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(201);

    await asOwnerB('get', `/meter-readings?roomId=${roomId}`).expect(404);
  });

  it('rejects listing readings for an unknown room (404)', async () => {
    await http(app).get('/meter-readings?roomId=nonexistent').expect(404);
  });

  it('rejects an invalid payload: bad month, negative reading, unknown field', async () => {
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 13, year: 2026, electricity: 100, water: 50 })
      .expect(400);
    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: -1, water: 50 })
      .expect(400);
    await http(app)
      .post('/meter-readings')
      .send({
        roomId,
        month: 8,
        year: 2026,
        electricity: 100,
        water: 50,
        hacked: true,
      })
      .expect(400);
    await http(app)
      .post('/meter-readings')
      .send({ month: 8, year: 2026, electricity: 100, water: 50 })
      .expect(400);
  });

  it('keeps readings isolated per house', async () => {
    const otherHouse = await http(app)
      .post('/boarding-houses')
      .send({ name: 'Second house', address: 'Addr 2' })
      .expect(201);
    const otherRoom = await http(app)
      .post('/rooms')
      .send({ code: 'B202', rentAmount: 2500000, houseId: otherHouse.body.id })
      .expect(201);

    await http(app)
      .post('/meter-readings')
      .send({ roomId, month: 8, year: 2026, electricity: 150, water: 70 })
      .expect(201);

    const otherRoomReadings = await http(app)
      .get(`/meter-readings?roomId=${otherRoom.body.id}`)
      .expect(200);
    expect(otherRoomReadings.body).toHaveLength(0);

    const ownReadings = await http(app)
      .get(`/meter-readings?roomId=${roomId}`)
      .expect(200);
    expect(ownReadings.body).toHaveLength(1);
    expect(houseId).toBeDefined();
  });
});
