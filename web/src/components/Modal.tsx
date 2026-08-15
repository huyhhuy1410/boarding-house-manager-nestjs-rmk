import type { ReactNode } from "react";

/**
 * Modal dùng chung cho các page. Pattern lấy từ MaintenanceRequestsPage:
 * - Overlay đóng khi click ra ngoài (e.target === e.currentTarget).
 * - Tiêu đề + nút đóng, body là children, footer tự do trong page.
 */

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate m-0">{title}</h3>
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
        {children}
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
  return <p className="mt-4 text-danger text-sm font-bold">{error?.message || "Có lỗi xảy ra."}</p>;
}