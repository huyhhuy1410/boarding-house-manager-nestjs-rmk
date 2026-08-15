import { useSyncExternalStore } from "react";

/**
 * useMediaQuery — theo dõi CSS media query bằng useSyncExternalStore.
 *
 * - Dùng useSyncExternalStore (React 18+) thay cho useEffect + useState để
 *   tránh re-render flash (renders ngay với giá trị đúng thay vì đợi effect).
 * - Luôn gọi hook (Rules of Hooks); guard `matchMedia` thiếu nằm bên trong
 *   subscribe/getSnapshot nên an toàn trên SSR/jsdom chưa mock.
 * - getServerSnapshot là nơi React đọc giá trị ban đầu khi hydration/SSR.
 */
function getMatches(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => {};
    }
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };

  const getSnapshot = () => getMatches(query);

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}
