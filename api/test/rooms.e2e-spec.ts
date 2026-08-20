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

describe('Rooms (e2e)', () => {
  let app: INestApplication;
  let houseId: string;

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
    houseId = house.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and lists rooms under an owned house', async () => {
    const createRes = await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId })
      .expect(201);
    expect(createRes.body).toMatchObject({ code: 'A101', rentAmount: 3000000 });

    const listRes = await http(app).get('/rooms').expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0]).toMatchObject({ code: 'A101' });
  });

  it('rejects a duplicate room code in the same house', async () => {
    await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId })
      .expect(201);
    await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId })
      .expect(409);
  });

  it('rejects a room with a missing house', async () => {
    await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId: 'nonexistent' })
      .expect(404);
  });

  it('rejects invalid room payload (negative rent, missing code)', async () => {
    await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: -100, houseId })
      .expect(400);
    await http(app)
      .post('/rooms')
      .send({ rentAmount: 3000000, houseId })
      .expect(400);
  });
});
