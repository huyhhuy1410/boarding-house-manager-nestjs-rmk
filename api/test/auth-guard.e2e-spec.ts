/**
 * Auth guard wiring (e2e).
 *
 * Mọi spec e2e khác chạy với `TestAuthGuard` (luôn `canActivate -> true`).
 * Nhờ vậy nếu ai đó gỡ `@UseGuards(AuthGuard)` khỏi một controller, không
 * suite nào khác phát hiện được. Suite này là chỗ duy nhất khẳng định
 * guard THẬT (Supabase JWKS) thực sự chặn request không có Bearer token.
 *
 * App ở đây KHÔNG override guard, nên không cần token hợp lệ cho bất kỳ
 * request nào: mọi request thiếu token phải bị chặn trước khi chạm service.
 *
 * The table below is the point of this suite: it lists every protected
 * controller, so a controller that loses `@UseGuards(AuthGuard)` fails here
 * instead of silently passing every other e2e spec.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthGuard wiring (e2e, real guard, no override)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // No .overrideGuard() call: this is the only suite that boots the app
    // with the production AuthGuard, which is the whole reason it exists.
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('rejects a protected GET without an Authorization header', async () => {
    await http().get('/boarding-houses').expect(401);
  });

  it('rejects a protected GET with an empty Bearer token', async () => {
    const res = await http()
      .get('/boarding-houses')
      .set('Authorization', 'Bearer ')
      .expect(401);
    // Header bị HTTP normalize thành "Bearer" (không dấu cách) nên guard rơi
    // vào nhánh thiếu scheme, không phải nhánh token rỗng.
    expect(res.body.message).toBe('Bearer token is required.');
  });

  it('rejects a protected GET with a non-Bearer scheme', async () => {
    const res = await http()
      .get('/boarding-houses')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
      .expect(401);
    expect(res.body.message).toBe('Bearer token is required.');
  });

  it('rejects a protected GET with a malformed Bearer token', async () => {
    const res = await http()
      .get('/boarding-houses')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
    // jwtVerify fail -> nhánh "Invalid access token."
    expect(res.body.message).toBe('Invalid access token.');
  });

  it('rejects a protected POST without an Authorization header', async () => {
    await http()
      .post('/invoices')
      .send({ contractId: 'nonexistent', month: 8, year: 2026 })
      .expect(401);
  });

  it('rejects a protected PATCH without an Authorization header', async () => {
    await http().patch('/maintenance-requests/nonexistent/start').expect(401);
  });

  it('rejects a protected DELETE without an Authorization header', async () => {
    await http().delete('/maintenance-requests/nonexistent').expect(401);
  });

  it.each([
    // One row per protected controller; adding a controller means adding a row.
    ['GET', '/auth/me'],
    ['GET', '/dashboard'],
    ['GET', '/rooms'],
    ['GET', '/tenants'],
    ['GET', '/contracts'],
    ['GET', '/meter-readings?roomId=nonexistent'],
    ['GET', '/invoices'],
    ['GET', '/expenses'],
    ['GET', '/maintenance-requests'],
  ])('rejects unauthenticated %s %s', async (method, url) => {
    await http()[method.toLowerCase() as 'get'](url).expect(401);
  });

  it('keeps the health endpoint public', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
