import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { MoneyInput } from "../components/MoneyInput";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";
import {
  fetchMaintenanceRequests,
  createMaintenanceRequest,
  startMaintenanceRequest,
  resolveMaintenanceRequest,
  cancelMaintenanceRequest,
  deleteMaintenanceRequest,
  type MaintenanceRequest,
  type CreateMaintenanceRequestDto,
  type ResolveMaintenanceRequestDto,
  type MaintenanceChargeTo,
} from "../api/maintenance-request";
import { fetchRooms } from "../api/room";
import { useMediaQuery } from "../hooks/useMediaQuery";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Mới",
  IN_PROGRESS: "Đang sửa",
  RESOLVED: "Đã xong",
  CANCELLED: "Đã hủy",
};

// Map theo palette chuẩn của toàn web:
// OPEN (chờ xử lý) -> blue; IN_PROGRESS (pending) -> warning; RESOLVED (hoàn thành) -> teal; CANCELLED -> muted
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-[#e9f5fb] text-blue",
  IN_PROGRESS: "bg-[#fff4e5] text-warning",
  RESOLVED: "bg-[#e6f7f2] text-[#08705f]",
  CANCELLED: "bg-[#eef2f6] text-muted",
};

const CHARGE_TO_LABEL: Record<MaintenanceChargeTo, string> = {
  TENANT: "Khách thuê",
  OWNER: "Chủ nhà",
};

// TENANT -> khách tự trả ngoài hệ thống (warning/cam); OWNER -> vào chi phí nhà trọ (blue)
const CHARGE_TO_COLOR: Record<MaintenanceChargeTo, string> = {
  TENANT: "bg-[#fff4e5] text-warning",
  OWNER: "bg-[#e9f5fb] text-blue",
};

const CHARGE_TO_HINT: Record<MaintenanceChargeTo, string> = {
  TENANT: "Khách tự trả, không vào hóa đơn",
  OWNER: "Đã ghi nhận vào chi phí nhà trọ",
};

const formatVnd = (amount: number) =>
  `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;

function ChargeToBadge({ chargeTo }: { chargeTo: MaintenanceChargeTo | null }) {
  if (!chargeTo) return <span className="text-muted">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${CHARGE_TO_COLOR[chargeTo]}`}
    >
      {CHARGE_TO_LABEL[chargeTo]}
    </span>
  );
}

export default function MaintenanceRequestsPage() {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateMaintenanceRequestDto>({
    roomId: "",
    tenantId: "",
    title: "",
    description: "",
  });
  const [resolveForm, setResolveForm] = useState<{
    id: string;
    chargeTo: MaintenanceChargeTo;
    estimatedCost: string;
    actualCost: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ["maintenance-requests"],
    queryFn: fetchMaintenanceRequests,
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const createMutation = useMutation({
    mutationFn: createMaintenanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      setShowForm(false);
      setForm({ roomId: "", tenantId: "", title: "", description: "" });
    },
  });

  const startMutation = useMutation({
    mutationFn: startMaintenanceRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveMaintenanceRequestDto }) =>
      resolveMaintenanceRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      setResolveForm(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelMaintenanceRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenanceRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] }),
  });

  const handleCreate = () => {
    const { tenantId, ...rest } = form;
    // Phòng trống -> tenantId rỗng -> bỏ hẳn field thay vì gửi "" cho API.
    createMutation.mutate(tenantId ? { ...rest, tenantId } : rest);
  };

  // Chọn phòng là gắn luôn khách thuê của contract đang ACTIVE (nếu có).
  // Đây là fix A1: trước đây tenantId luôn giữ "" nên request không bao giờ có tenant.
  const handleRoomChange = (roomId: string) => {
    const room = rooms?.find((rm) => rm.id === roomId);
    setForm({
      ...form,
      roomId,
      tenantId: room?.contract?.tenant?.id ?? "",
    });
  };

  const selectedRoom = rooms?.find((rm) => rm.id === form.roomId);

  const handleResolve = () => {
    if (!resolveForm) return;
    // Lớp phòng thủ ở FE: "khách thuê chịu phí" mà request không có khách là vô nghĩa.
    // Server cũng chặn (ConflictException), cái này chỉ để không gửi request thừa.
    if (resolveForm.chargeTo === "TENANT" && !resolveHasTenant) return;
    resolveMutation.mutate({
      id: resolveForm.id,
      data: {
        chargeTo: resolveForm.chargeTo,
        estimatedCost: resolveForm.estimatedCost ? Number(resolveForm.estimatedCost) : undefined,
        actualCost: resolveForm.actualCost ? Number(resolveForm.actualCost) : undefined,
      },
    });
  };

  // Tên phòng (mã) lookup: request không mang room code, đi qua rooms
  const roomCode = (roomId: string) => rooms?.find((rm) => rm.id === roomId)?.code ?? roomId;

  // Tên khách thuê lookup: BE trả tenant snapshot ({ id, name }) trong payload.
  // Fallback về "—" khi request không gắn khách.
  const tenantName = (r: MaintenanceRequest) => r.tenant?.name ?? null;

  // Request đang resolve — để biết nó có khách thuê hay không.
  const resolveRequest = resolveForm
    ? requests?.find((r) => r.id === resolveForm.id)
    : undefined;
  const resolveHasTenant = Boolean(resolveRequest?.tenantId);
  const resolveTenantName = resolveRequest?.tenant?.name ?? null;

  const filteredRequests = requests?.filter((r) =>
    matchesTerm(searchTerm, r.title, r.description, roomCode(r.roomId)),
  );

  const canDelete = (r: MaintenanceRequest) =>
    r.status === "OPEN" || (r.status === "IN_PROGRESS" && r.actualCost === null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách yêu cầu...</div>
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
            Yêu cầu sửa chữa
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách yêu cầu</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">Theo dõi và xử lý các yêu cầu sửa chữa.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tạo yêu cầu
          </button>
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm tiêu đề, mô tả, phòng..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {(error as Error).message}</p>
          </div>
        ) : requests && requests.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Chưa có yêu cầu sửa chữa nào.</p>
          </div>
        ) : filteredRequests && filteredRequests.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Không tìm thấy yêu cầu nào.</p>
          </div>
        ) : (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filteredRequests?.map((r) => (
                <article key={r.id} className="border border-border rounded-card bg-card shadow-card p-4">
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="min-w-0">
                      <h3 className="m-0 text-base font-bold text-slate">{r.title}</h3>
                      <p className="m-0 mt-0.5 text-[0.78rem] text-muted">
                        Phòng {roomCode(r.roomId)}
                        {tenantName(r) ? ` · ${tenantName(r)}` : ""}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold shrink-0 ${STATUS_COLOR[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.description && (
                    <p className="m-0 mt-2 text-[0.82rem] text-muted">{r.description}</p>
                  )}
                  <div className="mt-2 grid gap-1 text-[0.82rem] text-muted">
                    <span className="flex items-center gap-1.5">
                      Người chịu phí: <ChargeToBadge chargeTo={r.chargeTo} />
                    </span>
                    <span>
                      Chi phí: <strong className="text-slate font-semibold">{r.actualCost === null ? "—" : formatVnd(r.actualCost)}</strong>
                    </span>
                    {r.chargeTo && r.actualCost !== null && (
                      <span className="text-[0.72rem]">{CHARGE_TO_HINT[r.chargeTo]}</span>
                    )}
                    <span className="text-[0.75rem]">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {r.status === "OPEN" && (
                      <button
                        onClick={() => startMutation.mutate(r.id)}
                        disabled={startMutation.isPending}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50"
                      >
                        Bắt đầu
                      </button>
                    )}
                    {r.status === "IN_PROGRESS" && (
                      <button
                        onClick={() =>
                          setResolveForm({
                            id: r.id,
                            chargeTo: "OWNER",
                            estimatedCost: "",
                            actualCost: "",
                          })
                        }
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors"
                      >
                        Hoàn thành
                      </button>
                    )}
                    {(r.status === "OPEN" || r.status === "IN_PROGRESS") && (
                      <button
                        onClick={() => cancelMutation.mutate(r.id)}
                        disabled={cancelMutation.isPending}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-border rounded-btn text-muted hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    )}
                    {canDelete(r) && (
                      <button
                        onClick={() => {
                          if (confirm(`Xóa yêu cầu "${r.title}"?`)) deleteMutation.mutate(r.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-[#ffd5d2] rounded-btn text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    )}
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
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Tiêu đề</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Phòng</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Trạng thái</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Người chịu phí</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Chi phí thực tế</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Ngày tạo</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests?.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-[#f3f7f6]/50">
                      <td className="p-[15px_13px]">
                        <p className="m-0 text-[0.85rem] font-bold text-slate">{r.title}</p>
                        <p className="m-0 mt-0.5 text-muted text-[0.75rem] truncate max-w-[260px]">{r.description}</p>
                      </td>
                      <td className="p-[15px_13px]">
                        <p className="m-0 text-[0.82rem] text-slate">
                          {roomCode(r.roomId)}
                        </p>
                        {tenantName(r) && (
                          <p className="m-0 mt-0.5 text-[0.72rem] text-muted">
                            {tenantName(r)}
                          </p>
                        )}
                      </td>
                      <td className="p-[15px_13px]">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="p-[15px_13px]">
                        <ChargeToBadge chargeTo={r.chargeTo} />
                      </td>
                      <td className="p-[15px_13px]">
                        <p className="m-0 text-[0.82rem] text-slate">
                          {r.actualCost === null ? "—" : formatVnd(r.actualCost)}
                        </p>
                        {r.chargeTo && r.actualCost !== null && (
                          <p className="m-0 mt-0.5 text-[0.7rem] text-muted">
                            {CHARGE_TO_HINT[r.chargeTo]}
                          </p>
                        )}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-muted">
                        {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-[15px_13px] text-right">
                        <div className="flex gap-2 justify-end">
                          {r.status === "OPEN" && (
                            <button
                              onClick={() => startMutation.mutate(r.id)}
                              disabled={startMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50"
                            >
                              Bắt đầu
                            </button>
                          )}
                          {r.status === "IN_PROGRESS" && (
                            <button
                              onClick={() =>
                                setResolveForm({
                                  id: r.id,
                                  chargeTo: "OWNER",
                                  estimatedCost: "",
                                  actualCost: "",
                                })
                              }
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-transparent rounded-btn bg-teal text-white hover:bg-teal-dark transition-colors"
                            >
                              Hoàn thành
                            </button>
                          )}
                          {(r.status === "OPEN" || r.status === "IN_PROGRESS") && (
                            <button
                              onClick={() => cancelMutation.mutate(r.id)}
                              disabled={cancelMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-muted hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          )}
                          {canDelete(r) && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa yêu cầu "${r.title}"?`)) deleteMutation.mutate(r.id);
                              }}
                              disabled={deleteMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-[#ffd5d2] rounded-btn text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              Xóa
                            </button>
                          )}
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
      </div>

      {/* Create Modal */}
      {showForm && (
        <Modal title="Tạo yêu cầu sửa chữa" onClose={() => setShowForm(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Phòng</span>
                <select
                  value={form.roomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                >
                  <option value="">— Chọn phòng —</option>
                  {rooms?.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code} {room.contract?.tenant?.name ? `(${room.contract.tenant.name})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {/* Hint nằm NGOÀI label để accessible name của select vẫn là "Phòng". */}
              {selectedRoom && (
                <p className="m-0 text-[0.75rem] text-muted">
                  {selectedRoom.contract?.tenant
                    ? `Khách thuê: ${selectedRoom.contract.tenant.name}`
                    : "Phòng đang trống — yêu cầu sẽ không gắn khách thuê."}
                </p>
              )}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Tiêu đề</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ví dụ: Vòi nước bị rò rỉ"
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Mô tả</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Mô tả chi tiết vấn đề..."
                className="border border-border rounded-btn bg-white px-3 py-2 text-slate"
                required
              />
            </label>
          </div>
          {createMutation.isError && <MutationError error={createMutation.error} />}
          <ModalActions
            onCancel={() => setShowForm(false)}
            onSubmit={handleCreate}
            pending={createMutation.isPending}
            disabled={!form.roomId.trim() || !form.title.trim() || !form.description.trim()}
            label="Tạo yêu cầu"
          />
        </Modal>
      )}

      {/* Resolve Modal */}
      {resolveForm && (
        <Modal title="Hoàn thành sửa chữa" onClose={() => setResolveForm(null)}>
          <div className="flex flex-col gap-4">
            {resolveRequest && (
              <p className="m-0 text-[0.82rem] text-slate">
                Phòng {roomCode(resolveRequest.roomId)} ·{" "}
                {resolveHasTenant
                  ? `Khách thuê: ${resolveTenantName ?? "—"}`
                  : "Phòng trống — không có khách thuê"}
              </p>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Người chịu phí</span>
              <select
                value={resolveForm.chargeTo}
                onChange={(e) =>
                  setResolveForm({ ...resolveForm, chargeTo: e.target.value as MaintenanceChargeTo })
                }
                disabled={!resolveHasTenant}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate disabled:bg-slate-100 disabled:text-muted"
              >
                <option value="TENANT">Khách thuê</option>
                <option value="OWNER">Chủ nhà</option>
              </select>
            </label>
            <p className="m-0 text-[0.75rem] text-muted bg-[#f7f9fa] border border-border rounded-btn p-2.5">
              {resolveForm.chargeTo === "TENANT"
                ? "Khách thuê thanh toán trực tiếp cho bên sửa chữa. Chi phí này KHÔNG được cộng vào hóa đơn tháng; yêu cầu chỉ được lưu lại làm lịch sử sửa chữa của phòng."
                : "Chủ nhà chịu phí. Nếu chi phí thực tế > 0, hệ thống tự tạo một khoản chi (Expense) loại MAINTENANCE cho nhà trọ."}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Chi phí dự kiến (VNĐ)</span>
                <MoneyInput
                  value={resolveForm.estimatedCost}
                  onChange={(raw) => setResolveForm({ ...resolveForm, estimatedCost: raw })}
                  placeholder="Ví dụ: 500000"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Chi phí thực tế (VNĐ)</span>
                <MoneyInput
                  value={resolveForm.actualCost}
                  onChange={(raw) => setResolveForm({ ...resolveForm, actualCost: raw })}
                  placeholder="Ví dụ: 450000"
                />
              </label>
            </div>
          </div>
          {resolveMutation.isError && <MutationError error={resolveMutation.error} />}
          <ModalActions
            onCancel={() => setResolveForm(null)}
            onSubmit={handleResolve}
            pending={resolveMutation.isPending}
            disabled={false}
            label="Xác nhận hoàn thành"
          />
        </Modal>
      )}
    </div>
  );
}
