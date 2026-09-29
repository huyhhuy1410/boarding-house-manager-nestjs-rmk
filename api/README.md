# RentalHub API — NestJS + Prisma + Supabase

Backend của hệ thống quản lý nhà trọ: NestJS 11, Prisma 7, PostgreSQL (Supabase), xác thực bằng Supabase JWT (JWKS) và tài liệu OpenAPI tại **`/docs`**.

- **Port mặc định:** `3000` (đổi bằng biến `PORT`).
- **Không có global prefix** — route gốc là `/rooms`, `/invoices`, ...
- **Swagger UI:** `http://localhost:3000/docs`
- **Endpoint public duy nhất:** `GET /health`

## Cấu trúc `src/` — Vertical Slice

Mỗi feature là một module độc lập, gồm controller / service / DTO / spec riêng:

```text
src/
├── main.ts                 # bootstrap: CORS, global ValidationPipe, Swagger, listen
├── app.module.ts           # AppConfigModule, PrismaModule + 11 feature modules
├── auth/                   # AuthGuard (JWKS), bootstrap/me, CurrentUser decorator
├── boarding-houses/        # Nhà trọ + đơn giá điện/nước theo nhà
├── rooms/                  # Phòng, rentAmount, status VACANT/OCCUPIED
├── tenants/                # Khách thuê
├── contracts/              # Hợp đồng thuê (tenant ↔ room), kết thúc hợp đồng
├── meter-readings/         # Chỉ số điện nước theo (room, month, year)
├── invoices/               # Hóa đơn DRAFT → ISSUED → PAID / VOID
├── maintenance-requests/   # OPEN → IN_PROGRESS → RESOLVED / CANCELLED, chargeTo
├── expenses/               # Chi phí chủ nhà, link tới maintenance request
├── dashboard/              # Aggregate server-side (count / groupBy / sum)
├── health/                 # GET /health
├── config/                 # AppConfigModule + AppConfigService (validate env)
├── prisma/                 # PrismaService (@Global)
├── common/decorators/      # ApiAuthErrors (Swagger 401/403 dùng chung)
└── generated/prisma/       # Prisma client output — không sửa tay
```

## Biến môi trường

`AppConfigModule` nạp `.env.<NODE_ENV>` trước, fallback `.env`. `AppConfigService` validate và throw khi cấu hình sai.

| Biến | Bắt buộc | Ghi chú |
|------|-----------|---------|
| `SUPABASE_URL` | ✅ | Phải là URL `https` hợp lệ; dùng làm gốc cho JWKS URL. |
| `DATABASE_URL` | ✅ | Phải là PostgreSQL connection URL. |
| `DIRECT_URL` | ✅ | `prisma.config.ts` dùng làm `datasource.url` cho Prisma CLI. |
| `PORT` | ⬜ | Default `3000`. |
| `CORS_ORIGINS` | ⬜ | Default `http://localhost:5173`; bắt buộc ở production; không nhận `*`. |
| `NODE_ENV` | ⬜ | `development` \| `test` \| `production`. |

## Scripts

| Script | Lệnh | Mục đích |
|--------|------|---------|
| `npm run build` | `nest build` | Compile TypeScript vào `dist/`. |
| `npm run format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Format code. |
| `npm start` | `cross-env NODE_ENV=development nest start` | Chạy 1 lần, không watch. |
| `npm run start:dev` | `npm run start -- --watch` | Chạy dev có watch. |
| `npm run start:debug` | `npm run start -- --debug --watch` | Dev + Node inspector. |
| `npm run start:prod` | `cross-env NODE_ENV=production node dist/main` | Chạy bản build (nhớ `npm run build` trước). |
| `npm run lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | Lint và auto-fix. |
| `npm run db:generate` | `prisma generate` | Sinh Prisma client vào `src/generated/prisma`. |
| `npm run db:migrate` | `prisma migrate deploy` | Áp dụng migration đã có. |
| `npm run db:migrate:prod` | `cross-env NODE_ENV=production prisma migrate deploy` | Như trên, với `NODE_ENV=production`. |
| `npm run db:migrate:dev` | `cross-env NODE_ENV=development prisma migrate dev` | Tạo migration mới khi đổi schema. |
| `npm run db:migrate:test` | `cross-env NODE_ENV=test prisma migrate deploy` | Deploy migration cho database test (đọc `.env.test`). |
| `npm test` | `cross-env NODE_ENV=test jest` | Unit tests (`src/**/*.spec.ts`). |
| `npm run test:watch` | `npm run test -- --watchAll` | Unit tests ở chế độ watch. |
| `npm run test:cov` | `npm run test -- --coverage` | Unit tests + coverage ra `coverage/`. |
| `npm run test:debug` | `node --inspect-brk ... jest --runInBand` | Debug từng test trong IDE. |
| `npm run test:e2e` | `cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --config ./test/jest-e2e.json` | E2E tests qua HTTP thật. |

> `--experimental-vm-modules` là bắt buộc: Prisma 7 load Prisma engine qua WASM bằng dynamic import, Jest mặc định chặn.

## Chạy e2e tests

```bash
npm run db:migrate:test   # 1. Deploy migration vào database test
npm run test:e2e          # 2. Chạy suite
```

**Cảnh báo:** `api/test/setup-e2e.ts` nạp `.env.test` trước khi Nest đọc config (để không bao giờ rơi về `.env`), override `AuthGuard` bằng `TestAuthGuard`, và gọi `resetDatabase()` — `TRUNCATE ... RESTART IDENTITY CASCADE` trên cả 10 bảng — trước mỗi spec. `.env.test` dùng chung database local với dev, nên **chạy e2e sẽ xoá sạch dữ liệu dev**. Tách `DATABASE_URL`/`DIRECT_URL` sang một project Supabase riêng nếu bạn cần giữ dữ liệu.

Vài spec không dùng `TestAuthGuard` mà boot app với `AuthGuard` thật (`auth-guard.e2e-spec.ts`) để chứng minh request thiếu token bị `401`.

## Gọi API thủ công

API **không có endpoint login** — token lấy trực tiếp từ Supabase:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>"}'
# -> access_token

curl -X POST http://localhost:3000/auth/bootstrap \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Sau đó dùng `Authorization: Bearer $ACCESS_TOKEN` cho mọi endpoint khác. File `requests.http` có sẵn kịch bản REST Client (VS Code) đi hết flow: auth → rooms → tenants → contracts → meter readings → invoices → maintenance → expenses.

Xem thêm: [README gốc](../README.md) · Learning note [`docs/learning/10-backend-e2e-testing.md`](../docs/learning/10-backend-e2e-testing.md) · API spec trong `specs/`
