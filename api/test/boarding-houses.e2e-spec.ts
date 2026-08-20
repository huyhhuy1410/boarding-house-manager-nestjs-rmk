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

describe('BoardingHouses (e2e)', () => {
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

  it('creates a boarding house and lists it for the owner', async () => {
    const createRes = await http(app)
      .post('/boarding-houses')
      .send({ name: 'An Tam House', address: '123 Nguyen Trai' })
      .expect(201);

    expect(createRes.body).toMatchObject({
      name: 'An Tam House',
      address: '123 Nguyen Trai',
    });

    const listRes = await http(app).get('/boarding-houses').expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0]).toMatchObject({ name: 'An Tam House' });
  });

  it('rejects a boarding house with an empty name', async () => {
    await http(app)
      .post('/boarding-houses')
      .send({ name: '', address: '123 Nguyen Trai' })
      .expect(400);
  });

  it('rejects unknown body fields (forbidNonWhitelisted)', async () => {
    await http(app)
      .post('/boarding-houses')
      .send({ name: 'X', address: 'Y', ownerId: 'hack' })
      .expect(400);
  });

  it('updates and deletes a boarding house', async () => {
    const created = await http(app)
      .post('/boarding-houses')
      .send({ name: 'A', address: 'Addr A' })
      .expect(201);

    const updated = await http(app)
      .patch(`/boarding-houses/${created.body.id}`)
      .send({ name: 'A renamed' })
      .expect(200);
    expect(updated.body).toMatchObject({ name: 'A renamed' });

    const delRes = await http(app)
      .delete(`/boarding-houses/${created.body.id}`)
      .expect(200);
    // remove() returns { message: 'Boarding house deleted.' }, not the record
    expect(delRes.body).toEqual({ message: 'Boarding house deleted.' });
  });
});
