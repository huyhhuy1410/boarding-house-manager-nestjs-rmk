import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  createOwnerUser,
  getPrisma,
  http,
  resetDatabase,
  OWNER_AUTH_USER_ID,
  OWNER_EMAIL,
  OWNER_AUTH_USER_ID_B,
  OWNER_EMAIL_B,
} from './setup-e2e';

describe('Ownership isolation (e2e)', () => {
  let app: INestApplication;
  let ownerAResourceId: string;

  const asOwnerB = (verb: 'get' | 'post' | 'patch' | 'delete', url: string) =>
    http(app)[verb](url).set('x-auth-user-id', OWNER_AUTH_USER_ID_B);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    await createOwnerUser(app, OWNER_AUTH_USER_ID, OWNER_EMAIL);
    await createOwnerUser(app, OWNER_AUTH_USER_ID_B, OWNER_EMAIL_B);

    // owner A creates a boarding house
    const house = await http(app)
      .post('/boarding-houses')
      .send({ name: "Owner A's house", address: 'Addr' })
      .expect(201);
    ownerAResourceId = house.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("owner B cannot read owner A's boarding house", async () => {
    await asOwnerB('get', `/boarding-houses/${ownerAResourceId}`).expect(404);
  });

  it("owner B cannot list owner A's boarding houses", async () => {
    const res = await asOwnerB('get', '/boarding-houses').expect(200);
    expect(res.body).toHaveLength(0);
  });

  it("owner B cannot update owner A's boarding house", async () => {
    await asOwnerB('patch', `/boarding-houses/${ownerAResourceId}`)
      .send({ name: 'hacked' })
      .expect(404);
  });

  it("owner B cannot delete owner A's boarding house", async () => {
    await asOwnerB('delete', `/boarding-houses/${ownerAResourceId}`).expect(404);
  });

  it("owner B sees no rooms created by owner A", async () => {
    await http(app)
      .post('/rooms')
      .send({ code: 'A101', rentAmount: 3000000, houseId: ownerAResourceId })
      .expect(201);

    const res = await asOwnerB('get', '/rooms').expect(200);
    expect(res.body).toHaveLength(0);
  });
});
