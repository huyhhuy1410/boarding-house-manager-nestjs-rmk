import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { MoneyInput } from "../components/MoneyInput";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";
import {
  fetchContracts,
  fetchContract,
  createContract,
  endContract,
  type Contract,
} from "../api/contract";
import { fetchRooms } from "../api/room";
import { fetchTenants } from "../api/tenant";
import { fetchBoardingHouses, type BoardingHouse } from "../api/boarding-house";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface CreateFormState {
  roomId: string;
  tenantId: string;
  startsAt: string;
  deposit: string;
}

const emptyCreateForm: CreateFormState = {
  roomId: "",
  tenantId: "",
  startsAt: "",
  deposit: "",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang hiệu lực",
  ENDED: "Đã kết thúc",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-[#e6f7f2] text-[#08705f]",
  ENDED: "bg-[#eef2f6] text-muted",
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN") : "Không xác định";

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [houseFilter, setHouseFilter] = useState<string>("ALL");

  const { data: contracts, isLoading, error } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => fetchContracts(),
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
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
    queryKey: ["contracts", detailId],
    queryFn: () => fetchContract(detailId!),
    enabled: !!detailId,
  });

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
    },
  });

  const endMutation = useMutation({
    mutationFn: endContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      roomId: createForm.roomId,
      tenantId: createForm.tenantId,
      startsAt: createForm.startsAt ? `${createForm.startsAt}T00:00:00.000Z` : "",
      deposit: Number(createForm.deposit),
    });
  };

  const vacantRooms = rooms?.filter((room) => room.status === "VACANT");

  // Map phòng -> cơ sở (contract không mang houseId, đi qua room)
  const roomHouseId = (roomId: string) => rooms?.find((rm) => rm.id === roomId)?.houseId;

  const filteredContracts = contracts?.filter(
    (contract) =>
      (houseFilter === "ALL" || roomHouseId(contract.roomId) === houseFilter) &&
      matchesTerm(
        searchTerm,
        contract.tenant?.name,
        contract.tenant?.phone,
        contract.room?.code ?? rooms?.find((rm) => rm.id === contract.roomId)?.code ?? contract.roomId,
      ),
  );

  const createDisabled =
    !createForm.roomId ||
    !createForm.tenantId ||
    !createForm.startsAt ||
    createForm.deposit === "" ||
    Number(createForm.deposit) < 0 ||
    !Number.isInteger(Number(createForm.deposit));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách hợp đồng...</div>
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
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">Quản lý hợp đồng</h1>
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
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách hợp đồng</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">Theo dõi hợp đồng thuê phòng và thời hạn.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tạo hợp đồng mới
          </button>
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm khách thuê, số điện thoại, phòng..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {(error as Error).message}</p>
          </div>
        ) : filteredContracts && filteredContracts.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">
              {searchTerm.trim() || houseFilter !== "ALL" ? "Không tìm thấy hợp đồng nào." : "Chưa có hợp đồng nào."}
            </p>
          </div>
        ) : (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filteredContracts?.map((contract: Contract) => (
                <article key={contract.id} className="border border-border rounded-card bg-card shadow-card p-4">
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="min-w-0">
                      <h3 className="m-0 text-base font-bold text-slate truncate">
                        {contract.tenant?.name || "—"}
                      </h3>
                      <p className="m-0 mt-0.5 text-[0.78rem] text-muted">
                        Phòng {contract.room?.code || rooms?.find((rm) => rm.id === contract.roomId)?.code || contract.roomId}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold shrink-0 ${STATUS_COLOR[contract.status]}`}>
                      {STATUS_LABEL[contract.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1.5 text-[0.82rem] text-muted">
                    <span>
                      Bắt đầu: <strong className="text-slate font-semibold">{formatDate(contract.startsAt)}</strong>
                    </span>
                    <span>
                      Kết thúc: <strong className="text-slate font-semibold">{formatDate(contract.endsAt)}</strong>
                    </span>
                    <span>
                      Tiền thuê: <strong className="text-slate font-semibold">{new Intl.NumberFormat("vi-VN").format(rooms?.find((rm) => rm.id === contract.roomId)?.rentAmount ?? 0)} ₫/tháng</strong>
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setDetailId(contract.id)}
                      className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                    >
                      Chi tiết
                    </button>
                    {contract.status === "ACTIVE" && (
                      <button
                        onClick={() => {
                          const code = contract.room?.code || contract.roomId;
                          if (confirm(`Chấm dứt hợp đồng của phòng "${code}"?`)) endMutation.mutate(contract.id);
                        }}
                        disabled={endMutation.isPending}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-[#ffd5d2] text-danger rounded-btn hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Chấm dứt
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
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Phòng</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Người thuê</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Ngày bắt đầu</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Ngày kết thúc</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Tiền thuê/tháng</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Trạng thái</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts?.map((contract: Contract) => (
                    <tr key={contract.id} className="border-b border-border last:border-b-0 hover:bg-[#f3f7f6]/50">
                      <td className="p-[15px_13px] text-[0.85rem] font-bold text-slate">
                        {contract.room?.code || rooms?.find((rm) => rm.id === contract.roomId)?.code || contract.roomId}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem]">
                        <div className="font-bold text-slate">{contract.tenant?.name || "—"}</div>
                        <div className="text-muted text-[0.75rem]">{contract.tenant?.phone || ""}</div>
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">{formatDate(contract.startsAt)}</td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">{formatDate(contract.endsAt)}</td>
                      <td className="p-[15px_13px] text-[0.82rem] font-bold text-slate">
                        {new Intl.NumberFormat("vi-VN").format(rooms?.find((rm) => rm.id === contract.roomId)?.rentAmount ?? 0)} ₫
                      </td>
                      <td className="p-[15px_13px]">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${STATUS_COLOR[contract.status]}`}>
                          {STATUS_LABEL[contract.status]}
                        </span>
                      </td>
                      <td className="p-[15px_13px] text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setDetailId(contract.id)}
                            className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                          >
                            Chi tiết
                          </button>
                          {contract.status === "ACTIVE" && (
                            <button
                              onClick={() => {
                                const code = contract.room?.code || contract.roomId;
                                if (confirm(`Chấm dứt hợp đồng của phòng "${code}"?`)) endMutation.mutate(contract.id);
                              }}
                              disabled={endMutation.isPending}
                              className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-[#ffd5d2] text-danger rounded-btn hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              Chấm dứt
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

        {endMutation.isError && (
          <p className="mt-4 text-danger text-sm font-bold">
            {(endMutation.error as Error).message || "Không thể chấm dứt hợp đồng."}
          </p>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Tạo hợp đồng mới" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Phòng trống</span>
              <select
                value={createForm.roomId}
                onChange={(e) => setCreateForm({ ...createForm, roomId: e.target.value })}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              >
                <option value="">— Chọn phòng trống —</option>
                {vacantRooms?.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} · {new Intl.NumberFormat("vi-VN").format(room.rentAmount)} ₫/tháng
                  </option>
                ))}
              </select>
              {vacantRooms && vacantRooms.length === 0 && (
                <p className="text-muted text-[0.75rem]">Không có phòng trống nào để tạo hợp đồng.</p>
              )}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Khách thuê</span>
              <select
                value={createForm.tenantId}
                onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              >
                <option value="">— Chọn khách thuê —</option>
                {tenants?.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} {tenant.phone ? `· ${tenant.phone}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Ngày bắt đầu</span>
                <input
                  type="date"
                  value={createForm.startsAt}
                  onChange={(e) => setCreateForm({ ...createForm, startsAt: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Tiền đặt cọc (VNĐ)</span>
                <MoneyInput
                  value={createForm.deposit}
                  onChange={(raw) => setCreateForm({ ...createForm, deposit: raw })}
                  placeholder="Ví dụ: 3000000"
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
            label="Tạo hợp đồng"
          />
        </Modal>
      )}

      {/* Detail Modal */}
      {detailId && (
        <Modal title="Chi tiết hợp đồng" onClose={() => setDetailId(null)}>
          {detailLoading ? (
            <div className="py-8 text-center text-muted text-sm font-semibold">Đang tải chi tiết...</div>
          ) : detailError ? (
            <p className="text-danger text-sm font-bold">{(detailError as Error).message || "Không thể tải chi tiết."}</p>
          ) : detail ? (
            <div className="space-y-3 text-[0.85rem]">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Phòng</span>
                <strong className="text-slate">{detail.room?.code || detail.roomId}</strong>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Khách thuê</span>
                <strong className="text-slate">{detail.tenant?.name || "—"}</strong>
              </div>
              {detail.tenant?.phone && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted">Số điện thoại</span>
                  <strong className="text-slate">{detail.tenant.phone}</strong>
                </div>
              )}
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Ngày bắt đầu</span>
                <strong className="text-slate">{formatDate(detail.startsAt)}</strong>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Ngày kết thúc</span>
                <strong className="text-slate">{formatDate(detail.endsAt)}</strong>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Tiền đặt cọc</span>
                <strong className="text-slate">{new Intl.NumberFormat("vi-VN").format(detail.deposit)} ₫</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Trạng thái</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-extrabold ${STATUS_COLOR[detail.status]}`}>
                  {STATUS_LABEL[detail.status]}
                </span>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
