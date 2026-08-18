import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Ép timezone cố định để test hiển thị ngày giờ (ExpensesPage) không phụ
    // thuộc múi giờ của máy chạy. Áp dụng cho toàn bộ worker của Vitest.
    env: {
      TZ: 'Asia/Ho_Chi_Minh',
    },
  },
})
