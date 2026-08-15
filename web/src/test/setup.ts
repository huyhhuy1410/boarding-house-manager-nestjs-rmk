import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Vitest không bật globals, nên @testing-library/react không tự đăng ký cleanup.
// Gọi cleanup sau mỗi test để tránh DOM bị tích lũy giữa các test.
afterEach(() => {
  cleanup();
});

/**
 * jsdom không cài matchMedia, nên useMediaQuery sẽ fallback false (desktop).
 * Mock mặc định "desktop" giúp các page test render table (view desktop) như cũ,
 * tránh DOM trùng lặp card + table làm hỏng getByText.
 *
 * Test cần mô phỏng mobile có thể override `window.matchMedia` với helper
 * `setViewportWidth()` rồi render lại component.
 */
export function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('max-width') && width <= 767,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  setViewportWidth(1280);
});
