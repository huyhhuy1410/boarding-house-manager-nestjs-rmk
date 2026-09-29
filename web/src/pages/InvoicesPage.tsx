import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { getApiErrorMessage } from "../api/errors";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";
import {
  fetchInvoices,
  fetchInvoice,
  createInvoice,
  issueInvoice,
  payInvoice,
  voidInvoice,
  type Invoice,
  type InvoiceItem,
} from "../api/invoice";
import { fetchContracts, type Contract } from "../api/contract";
import { fetchRooms } from "../api/room";
import { fetchBoardingHouses, type BoardingHouse } from "../api/boarding-house";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface CreateFormState {
  contractId: string;
  month: string;
  year: string;
}

const emptyCreateForm: CreateFormState = {
  contractId: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  ISSUED: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  VOID: "Đã vô hiệu hóa",
};

const STATUS_COLOR: Record<string, string> = {
  PAID: "bg-[#e6f7f2] text-[#08705f]",
  ISSUED: "bg-[#fff4e5] text-warning",
  DRAFT: "bg-[#e9f5fb] text-blue",
  VOID: "bg-[#eef2f6] text-muted",
};

type StatusFilter = "ALL" | "ISSUED" | "PAID" | "DRAFT";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "ISSUED", label: "Chờ thanh toán" },
  { key: "PAID", label: "Đã thanh toán" },
  { key: "DRAFT", label: "Nháp" },
];

const formatVND = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "—");

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [houseFilter, setHouseFilter] = useState<string>("ALL");

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  const { data: activeContracts } = useQuery({
    queryKey: ["contracts", "ACTIVE"],
    queryFn: () => fetchContracts("ACTIVE"),
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const { data: houses } = useQuery<BoardingHouse[]>({
    queryKey: ["boarding-houses"],
    queryFn: fetchBoardingHouses,
  });

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ["invoices", detailId],
    queryFn: () => fetchInvoice(detailId!),
    enabled: !!detailId,
  });

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ action, id }: { action: "issue" | "pay" | "void"; id: string }) => {
      if (action === "issue") return issueInvoice(id);
      if (action === "pay") return payInvoice(id);
      return voidInvoice(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const handleCreate = () => {
    createMutation.mutate({
      contractId: createForm.contractId,
      month: Number(createForm.month),
      year: Number(createForm.year),
    });
  };

  const handleLifecycle = (invoice: Invoice, action: "issue" | "pay" | "void") => {
    const confirmMsg: Record<string, string> = {
      issue: `Phát hành hóa đơn của ${invoice.contract?.tenant?.name ?? "khách thuê"}?`,
      pay: `Xác nhận đã thu ${formatVND(invoice.total)} ₫?`,
      void: `Vô hiệu hóa hóa đơn ${invoice.month}/${invoice.year}?`,
    };
    if (confirm(confirmMsg[action])) lifecycleMutation.mutate({ action, id: invoice.id });
  };

  // Map invoice -> cơ sở: invoice.contract.room.id là room id, đi qua rooms để lấy houseId
  const roomHouseId = (roomId: string | undefined) =>
    rooms?.find((r) => r.id === roomId)?.houseId;

  const filteredInvoices = invoices?.filter(
    (inv) =>
      (statusFilter === "ALL" || inv.status === statusFilter) &&
      (houseFilter === "ALL" || roomHouseId(inv.contract?.room?.id) === houseFilter) &&
      matchesTerm(
        searchTerm,
        inv.contract?.tenant?.name,
        inv.contract?.tenant?.phone,
        inv.contract?.room?.code,
        `${inv.month}/${inv.year}`,
      ),
  );

  const pendingCount = invoices?.filter((inv) => inv.status === "ISSUED").length ?? 0;

  const createDisabled =
    !createForm.contractId ||
    !createForm.month ||
    !createForm.year ||
    Number(createForm.month) < 1 ||
    Number(createForm.month) > 12 ||
    Number(createForm.year) < 1990 ||
    Number(createForm.year) > 2100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách hóa đơn...</div>
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
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">Quản lý hóa đơn</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2.5 text-[0.8rem] font-bold text-slate w-full md:w-auto">
            Cơ sở
            <select
              value={houseFilter}
              onChange={(e) => setHouseFilter(e.target.value)}
              className="border border-border rounded-btn bg-white px-3 w-full md:w-auto md:min-w-[165px] h-[44px] text-slate font-normal focus:outline-none focus:ring-2 focus:ring-teal/30"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {houses?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* Content */}
      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách hóa đơn</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">
              {pendingCount} hóa đơn đang chờ thanh toán.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tạo hóa đơn mới
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2.5 mb-[18px]">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`min-h-[40px] rounded-full px-3.5 font-bold text-[0.78rem] transition-colors ${
                statusFilter === f.key
                  ? "border border-teal bg-teal text-white"
                  : "border border-border bg-white text-muted hover:border-slate/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm khách thuê, số điện thoại, phòng, kỳ..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {getApiErrorMessage(error)}</p>
          </div>
        ) : invoices && invoices.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Chưa có hóa đơn nào.</p>
          </div>
        ) : filteredInvoices && filteredInvoices.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Không có hóa đơn nào trong bộ lọc này.</p>
          </div>
        ) : (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filteredInvoices?.map((invoice: Invoice) => (
                <article key={invoice.id} className="border border-border rounded-card bg-card shadow-card p-4">
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="min-w-0">
                      <h3 className="m-0 text-base font-bold text-slate truncate">
                        {invoice.contract?.tenant?.name || "—"}
                      </h3>
                      <p className="m-0 mt-0.5 text-[0.78rem] text-muted">
                        {invoice.contract?.room?.code || "—"} · Kỳ {invoice.month}/{invoice.year}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold shrink-0 ${STATUS_COLOR[invoice.status]}`}>
                      {STATUS_LABEL[invoice.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <strong className="text-slate text-base font-bold">
                      {formatVND(invoice.total)} ₫
                    </strong>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {invoice.status === "ISSUED" && (
                        <button
                          onClick={() => handleLifecycle(invoice, "pay")}
                          disabled={lifecycleMutation.isPending}
                          className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50"
                        >
                          Đã thu
                        </button>
                      )}
                      {invoice.status === "DRAFT" && (
                        <button
                          onClick={() => handleLifecycle(invoice, "issue")}
                          disabled={lifecycleMutation.isPending}
                          className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50"
                        >
                          Phát hành
                        </button>
                      )}
                      {(invoice.status === "DRAFT" || invoice.status === "ISSUED") && (
                        <button
                          onClick={() => handleLifecycle(invoice, "void")}
                          disabled={lifecycleMutation.isPending}
                          className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-border rounded-btn text-muted hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Vô hiệu
                        </button>
                      )}
                      <button
                        onClick={() => setDetailId(invoice.id)}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
          <div className="border border-border rounded-card bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-[#fdfdfd]">
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Phòng</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Người thuê</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Kỳ thanh toán</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Tổng tiền</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Trạng thái</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices?.map((invoice: Invoice) => (
                    <tr key={invoice.id} className="border-b border-border last:border-b-0 hover:bg-[#f3f7f6]/50">
                      <td className="p-[15px_13px] text-[0.85rem] font-bold text-slate">
                        {invoice.contract?.room?.code || "—"}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">
                        {invoice.contract?.tenant?.name || "—"}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">
                        {invoice.month}/{invoice.year}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] font-bold text-slate">
                        {formatVND(invoice.total)} ₫
                      </td>
                      <td className="p-[15px_13px]">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${STATUS_COLOR[invoice.status]}`}>
                          {STATUS_LABEL[invoice.status]}
                        </span>
                      </td>
                      <td className="p-[15px_13px] text-right">
                        <div className="flex gap-2 justify-end">
                          {invoice.status === "ISSUED" && (
                            <button
                              onClick={() => handleLifecycle(invoice, "pay")}
                              disabled={lifecycleMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50"
                            >
                              Đã thu
                            </button>
                          )}
                          {invoice.status === "DRAFT" && (
                            <button
                              onClick={() => handleLifecycle(invoice, "issue")}
                              disabled={lifecycleMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50"
                            >
                              Phát hành
                            </button>
                          )}
                          {(invoice.status === "DRAFT" || invoice.status === "ISSUED") && (
                            <button
                              onClick={() => handleLifecycle(invoice, "void")}
                              disabled={lifecycleMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-muted hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              Vô hiệu
                            </button>
                          )}
                          <button
                            onClick={() => setDetailId(invoice.id)}
                            className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {lifecycleMutation.isError && (
          <p className="mt-4 text-danger text-sm font-bold">
            {lifecycleMutation.error && getApiErrorMessage(lifecycleMutation.error, "Không thể thực hiện thao tác.")}
          </p>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Tạo hóa đơn mới" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Hợp đồng (đang hiệu lực)</span>
              <select
                value={createForm.contractId}
                onChange={(e) => setCreateForm({ ...createForm, contractId: e.target.value })}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              >
                <option value="">— Chọn hợp đồng —</option>
                {activeContracts?.map((contract: Contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.room?.code || "Phòng"} · {contract.tenant?.name || "Khách thuê"}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Tháng</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={createForm.month}
                  onChange={(e) => setCreateForm({ ...createForm, month: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Năm</span>
                <input
                  type="number"
                  min={1990}
                  max={2100}
                  value={createForm.year}
                  onChange={(e) => setCreateForm({ ...createForm, year: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
            </div>
          </div>
          {createMutation.isError && <MutationError error={createMutation.error} />}
          <ModalActions
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
            pending={createMutation.isPending}
            disabled={createDisabled}
            label="Tạo hóa đơn"
          />
        </Modal>
      )}

      {/* Detail Modal */}
      {detailId && (
        <Modal title={`Chi tiết hóa đơn ${detail?.month ?? ""}/${detail?.year ?? ""}`} onClose={() => setDetailId(null)}>
          {detailLoading ? (
            <div className="py-8 text-center text-muted text-sm font-semibold">Đang tải chi tiết...</div>
          ) : detailError ? (
            <p className="text-danger text-sm font-bold">{(detailError as Error).message || "Không thể tải chi tiết."}</p>
          ) : detail ? (
            <div>
              <div className="space-y-3 text-[0.85rem] mb-5">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Phòng</span>
                  <strong className="text-slate">{detail.contract?.room?.code || detail.contractId}</strong>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Khách thuê</span>
                  <strong className="text-slate">{detail.contract?.tenant?.name || "—"}</strong>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Kỳ thanh toán</span>
                  <strong className="text-slate">{detail.month}/{detail.year}</strong>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Trạng thái</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${STATUS_COLOR[detail.status]}`}>
                    {STATUS_LABEL[detail.status]}
                  </span>
                </div>
              </div>

              {detail.items && detail.items.length > 0 && (
                <div className="border border-border rounded-card overflow-hidden mb-5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-[#fdfdfd]">
                        <th className="p-[10px_13px] text-muted text-[0.68rem] uppercase tracking-wider font-extrabold">Khoản mục</th>
                        <th className="p-[10px_13px] text-muted text-[0.68rem] uppercase tracking-wider font-extrabold text-right">Số lượng</th>
                        <th className="p-[10px_13px] text-muted text-[0.68rem] uppercase tracking-wider font-extrabold text-right">Đơn giá</th>
                        <th className="p-[10px_13px] text-muted text-[0.68rem] uppercase tracking-wider font-extrabold text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item: InvoiceItem) => (
                        <tr key={item.id} className="border-b border-border last:border-b-0">
                          <td className="p-[10px_13px] text-[0.8rem] text-slate">
                            <div className="font-bold">{item.description || item.type}</div>
                            <div className="text-muted text-[0.7rem]">{item.type}</div>
                          </td>
                          <td className="p-[10px_13px] text-[0.8rem] text-slate text-right">{item.quantity}</td>
                          <td className="p-[10px_13px] text-[0.8rem] text-slate text-right">{formatVND(item.unitPrice)}</td>
                          <td className="p-[10px_13px] text-[0.8rem] font-bold text-slate text-right">{formatVND(item.amount)} ₫</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-border pt-3 text-[0.9rem]">
                <span className="text-muted">Tổng cộng</span>
                <strong className="text-slate text-[1.05rem]">{formatVND(detail.total)} ₫</strong>
              </div>

              <div className="mt-4 space-y-1.5 text-[0.78rem] text-muted">
                <p className="m-0">Phát hành: {formatDate(detail.issuedAt)}</p>
                <p className="m-0">Hạn thanh toán: {formatDate(detail.dueAt)}</p>
                <p className="m-0">Đã thanh toán: {formatDate(detail.paidAt)}</p>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
