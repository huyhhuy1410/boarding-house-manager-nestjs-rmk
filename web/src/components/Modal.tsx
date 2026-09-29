import { useEffect, useId, useRef, type ReactNode } from "react";
import { getApiErrorMessage } from "../api/errors";

/**
 * The single dialog used by every page. Beyond the visual shell it carries the
 * keyboard contract a dialog is expected to have, because a modal that steals
 * the viewport without it is unusable with a keyboard or a screen reader:
 *  - announced as a dialog and named by its title
 *  - focus moves in on open, lands on the first form field (not the close
 *    button), and returns to the trigger on close
 *  - Escape closes, Tab and Shift+Tab cycle inside instead of escaping to the
 *    page behind
 *
 * The overlay listens on `pointerdown`, not `click`: with `click`, pressing
 * inside a textarea and releasing the mouse outside the panel would close
 * the dialog and discard what was typed.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    // Ưu tiên focus vào phần tử nhập liệu đầu tiên trong body, bỏ qua nút
    // "Đóng" ở header để người dùng không phải Tab qua nó khi mở form.
    const body = panel?.querySelector<HTMLElement>('[data-modal-body]');
    const first =
      body?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panel)?.focus();

    return () => {
      // Focus trả về nơi đã mở modal sau khi modal bị unmount.
      opener?.focus();
    };
  }, []);

  // Key handling lives on the panel, not on `document`: React's synthetic
  // events only fire for elements inside the React tree, so this is both
  // sufficient (focus is trapped in the panel) and free of listener cleanup.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key !== "Tab") {
      return;
    }

    // Focus trap: Tab ở phần tử cuối quay lại đầu, Shift+Tab ở đầu quay về cuối.
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 id={titleId} className="text-lg font-bold text-slate m-0">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div data-modal-body>{children}</div>
      </div>
    </div>
  );
}

/** Footer nút Hủy / hành động chính, disabled trong lúc pending. */
export function ModalActions({
  onCancel,
  onSubmit,
  pending,
  disabled,
  label,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  pending: boolean;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
      <button
        onClick={onCancel}
        className="inline-flex items-center justify-center gap-2 border border-border rounded-btn px-4 bg-white text-slate font-bold text-sm min-h-[44px] hover:bg-slate-50 transition-colors"
      >
        Huỷ
      </button>
      <button
        onClick={onSubmit}
        disabled={pending || disabled}
        className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Đang lưu..." : label}
      </button>
    </div>
  );
}

/** Hiển thị lỗi mutation (create/update/delete) trong modal. */
export function MutationError({ error }: { error: Error | null }) {
  return <p className="mt-4 text-danger text-sm font-bold">{getApiErrorMessage(error)}</p>;
}
