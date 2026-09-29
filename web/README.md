# RentalHub Web — React + Vite + TanStack Query

Frontend mobile-first cho hệ thống quản lý nhà trọ: **React 19**, **Vite 8**, **TanStack Query 5**, **React Router 7**, **Tailwind CSS 3**, **Axios**. Mỗi trang list hiển thị dạng card trên mobile và dạng table trên desktop (dựa trên `useMediaQuery`).

## Scripts

| Script | Lệnh | Mục đích |
|--------|------|---------|
| `npm run dev` | `vite` | Dev server tại `http://localhost:5173`. |
| `npm run build` | `tsc -b && vite build` | **Type-check + build production.** Script `type-check` của Vite template là no-op ở đây — dùng `npm run build` để bắt lỗi TypeScript. |
| `npm run lint` | `eslint .` | Lint. |
| `npm run preview` | `vite preview` | Xem bản build. |
| `npm test` | `vitest` | **Watch mode.** Dùng khi viết test. |
| `npm run test:run` | `vitest run` | Chạy một lần rồi thoát — dùng cho CI / kiểm tra nhanh. |
| `npm run test:coverage` | `vitest run --coverage` | Test + coverage ra `coverage/`. |

## Biến môi trường

Tạo `web/.env` (repo này **không** có `web/.env.example`):

| Biến | Bắt buộc | Dùng ở đâu |
|------|-----------|-----------|
| `VITE_SUPABASE_URL` | ✅ | `api/auth.ts` — gọi Supabase `POST /auth/v1/token?grant_type=password` để đăng nhập. |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Gửi kèm header `apikey` của request đăng nhập. |
| `VITE_API_URL` | ⬜ | Base URL của NestJS API. Default `http://localhost:3000`. |

## Cấu trúc `src/`

```text
src/
├── main.tsx                 # QueryClientProvider (staleTime 5 phút, retry 1) + ReactQueryDevtools
├── App.tsx                  # Router: /login public, 9 trang protected, catch-all -> /
├── index.css                # Tailwind directives + @layer base (min-height 44px cho control)
├── pages/                   # 1 page = 1 feature, kèm *.test.tsx cạnh bên
│   ├── LoginPage.tsx        # Đăng nhập qua Supabase, lưu access_token vào localStorage
│   ├── DashboardPage.tsx    # Gọi GET /dashboard (aggregate server-side)
│   ├── RoomsPage / TenantsPage / ContractsPage / InvoicesPage
│   ├── BoardingHousesPage / MeterReadingsPage
│   ├── MaintenanceRequestsPage / ExpensesPage
├── api/                     # 1 file client axios cho mỗi feature
│   ├── client.ts            # baseURL = VITE_API_URL, interceptor Bearer + 401 -> /login
│   └── auth.ts              # login() gọi thẳng Supabase, getCurrentUser() gọi /auth/me
├── components/              # Layout, ProtectedRoute, Modal, MoneyInput, SearchInput, search.ts
├── hooks/useMediaQuery.ts   # phân biệt mobile/desktop
├── types/                   # auth.ts, room.ts
├── test/setup.ts            # jest-dom, cleanup, mock matchMedia mặc định desktop (1280px)
└── utils/
```

## Vài quy ước đáng biết

- **Auth**: không có backend login. `LoginPage` lấy `access_token` từ Supabase rồi lưu vào `localStorage["access_token"]`; `api/client.ts` gắn header `Authorization` cho mọi request. `ProtectedRoute` chỉ kiểm tra token có tồn tại; **không có refresh token** — hết hạn thì `401` kích hoạn redirect `/login`.
- **Styling**: dùng Tailwind utility classes kèm design tokens định nghĩa trong `tailwind.config.js` (màu `teal`/`slate`/`canvas`, `borderRadius.btn`, `shadow.card`, font `Plus Jakarta Sans`). Không có CSS module hay CSS-in-JS.
- **Server state**: TanStack Query là nguồn dữ liệu duy nhất; sau mỗi mutation đều `invalidateQueries` thay vì cập nhật cache thủ công.
- **Test**: Vitest + React Testing Library, môi trường `jsdom`, timezone ép `Asia/Ho_Chi_Minh` (trong `vite.config.ts`) để test hiển thị ngày giờ ổn định.

## Tài liệu học tập (AI Agents)

Xem tóm tắt kiến thức từ các khóa học AI Agents của Google và Kaggle tại đây:
*   [5-Day AI Agents Intensive Course (11/2025)](docs/5-day-ai-agents-intensive.md)
*   [5-Day AI Agents: Intensive Vibe Coding Course (06/2026)](docs/5-day-ai-agents-vibe-coding.md)

---

Xem thêm: [README gốc](../README.md) · [`api/README.md`](../api/README.md)
