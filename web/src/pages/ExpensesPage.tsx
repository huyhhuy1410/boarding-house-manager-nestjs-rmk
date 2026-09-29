import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchExpenses,
  createExpense,
  type Expense,
  type CreateExpenseDto,
  type ExpenseCategory,
} from "../api/expense";
import { fetchBoardingHouses, type BoardingHouse } from "../api/boarding-house";
import { MoneyInput } from "../components/MoneyInput";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { getApiErrorMessage } from "../api/errors";
import { useMediaQuery } from "../hooks/useMediaQuery";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "Sửa chữa",
  UTILITIES: "Tiện ích",
  OTHER: "Khác",
};

const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  MAINTENANCE: "bg-amber-50 text-amber-700",
  UTILITIES: "bg-blue-50 text-blue-700",
  OTHER: "bg-slate-100 text-slate-600",
};

const CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "🔧",
  UTILITIES: "⚡",
  OTHER: "📋",
};

// Ngày giờ địa phương cho input datetime-local (không dùng UTC -> lệch giờ với VN).
const nowLocalInputValue = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Định dạng "16/08/2026 14:30" cho cột Ngày chi.
const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const initialForm: CreateExpenseDto = {
  boardingHouseId: "",
  category: "MAINTENANCE",
  title: "",
  description: "",
  amount: 0,
  spentAt: nowLocalInputValue(),
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateExpenseDto>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: expenses, isLoading, error } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });

  const { data: houses } = useQuery<BoardingHouse[]>({
    queryKey: ["boarding-houses"],
    queryFn: fetchBoardingHouses,
  });

  const filteredExpenses = expenses?.filter((expense) =>
    matchesTerm(
      searchTerm,
      expense.title,
      expense.boardingHouse?.name,
      CATEGORY_LABELS[expense.category],
    ),
  );

  const mutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowCreate(false);
      setForm(initialForm);
    },
  });

  const handleCreate = () => {
    mutation.mutate({
      ...form,
      spentAt: new Date(form.spentAt).toISOString(),
    });
  };

  const totalAmount = expenses
    ? expenses.reduce((sum, e) => sum + e.amount, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách chi phí...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Topbar */}
      <header className="min-h-[104px] flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-[clamp(20px,4vw,52px)] py-[22px] border-b border-border bg-white/88 backdrop-blur-[10px]">
        <div>
          <p className="m-0 mb-1.5 text-teal text-[0.75rem] font-extrabold tracking-widest uppercase">
            Nhà trọ An Tâm
          </p>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">
            Quản lý chi phí
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách chi phí</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">
              Theo dõi các khoản chi: sửa chữa, tiện ích và chi phí khác.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {expenses && expenses.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted m-0">Tổng chi</p>
                <p className="text-lg font-extrabold text-danger m-0">
                  {new Intl.NumberFormat("vi-VN").format(totalAmount)} ₫
                </p>
              </div>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
            >
              <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Thêm chi phí
            </button>
          </div>
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm tiêu đề, cơ sở, loại chi..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {getApiErrorMessage(error)}</p>
          </div>
        ) : expenses && expenses.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Chưa có khoản chi nào. Hãy thêm khoản chi đầu tiên!</p>
          </div>
        ) : filteredExpenses && filteredExpenses.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Không tìm thấy khoản chi nào.</p>
          </div>
        ) : (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filteredExpenses?.map((expense) => (
                <article key={expense.id} className="border border-border rounded-card bg-card shadow-card p-4">
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="min-w-0">
                      <h3 className="m-0 text-base font-bold text-slate truncate">{expense.title}</h3>
                      <p className="m-0 mt-0.5 text-[0.78rem] text-muted">
                        {expense.boardingHouse?.name ?? "—"}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold shrink-0 ${CATEGORY_STYLES[expense.category]}`}>
                      {CATEGORY_EMOJIS[expense.category]} {CATEGORY_LABELS[expense.category]}
                    </span>
                  </div>
                  {expense.description && (
                    <p className="m-0 mt-2 text-[0.82rem] text-muted">{expense.description}</p>
                  )}
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="grid gap-0.5 text-[0.78rem] text-muted">
                      <span>{formatDateTime(expense.spentAt)}</span>
                      {expense.maintenanceRequest && (
                        <span className="text-[0.7rem]">🔗 {expense.maintenanceRequest.title}</span>
                      )}
                    </div>
                    <strong className="text-slate text-base font-bold shrink-0">
                      {new Intl.NumberFormat("vi-VN").format(expense.amount)} ₫
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
          <div className="border border-border rounded-card bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-[#fdfdfd]">
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Cơ sở</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Tiêu đề</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Loại</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Số tiền</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Ngày chi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses?.map((expense) => (
                    <tr key={expense.id} className="border-b border-border last:border-b-0 hover:bg-[#f3f7f6]/50">
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">
                        {expense.boardingHouse?.name ?? "—"}
                      </td>
                      <td className="p-[15px_13px]">
                        <div className="text-[0.82rem] font-bold text-slate">{expense.title}</div>
                        {expense.description && (
                          <div className="text-[0.75rem] text-muted mt-0.5 line-clamp-1">
                            {expense.description}
                          </div>
                        )}
                        {expense.maintenanceRequest && (
                          <div className="text-[0.7rem] text-muted mt-0.5">
                            🔗 {expense.maintenanceRequest.title}
                          </div>
                        )}
                      </td>
                      <td className="p-[15px_13px]">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${CATEGORY_STYLES[expense.category]}`}>
                          {CATEGORY_EMOJIS[expense.category]} {CATEGORY_LABELS[expense.category]}
                        </span>
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] font-bold text-slate">
                        {new Intl.NumberFormat("vi-VN").format(expense.amount)} ₫
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-muted">
                        {formatDateTime(expense.spentAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Thêm khoản chi mới" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
              {/* Boarding House */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Cơ sở</span>
                <select
                  value={form.boardingHouseId}
                  onChange={(e) => setForm({ ...form, boardingHouseId: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="">— Chọn cơ sở —</option>
                  {houses?.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </label>

              {/* Category */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Loại chi phí</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="MAINTENANCE">🔧 Sửa chữa</option>
                  <option value="UTILITIES">⚡ Tiện ích</option>
                  <option value="OTHER">📋 Khác</option>
                </select>
              </label>

              {/* Title */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Tiêu đề</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ví dụ: Tiền điện khu vực chung"
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate focus:outline-none focus:ring-2 focus:ring-teal/30 placeholder:text-muted"
                />
              </label>

              {/* Description */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Mô tả (tuỳ chọn)</span>
                <input
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
                  placeholder="Chi tiết khoản chi..."
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate focus:outline-none focus:ring-2 focus:ring-teal/30 placeholder:text-muted"
                />
              </label>

              {/* Amount */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Số tiền (VNĐ)</span>
                <MoneyInput
                  value={form.amount === 0 ? "" : String(form.amount)}
                  onChange={(raw) => setForm({ ...form, amount: raw === "" ? 0 : Number(raw) })}
                  placeholder="150000"
                />
              </label>

              {/* Spent At */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Ngày chi</span>
                <input
                  type="datetime-local"
                  value={form.spentAt}
                  onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </label>
            </div>

            {/* Error */}
            {mutation.isError && <MutationError error={mutation.error} />}

            {/* Actions */}
            <ModalActions
              onCancel={() => setShowCreate(false)}
              onSubmit={handleCreate}
              pending={mutation.isPending}
              disabled={!form.boardingHouseId || !form.title.trim() || form.amount <= 0}
              label="Tạo khoản chi"
            />
        </Modal>
      )}
    </div>
  );
}
