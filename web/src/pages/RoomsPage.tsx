import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoom, deleteRoom, fetchRooms, updateRoom } from "../api/room";
import type { RoomDto } from "../types/room";
import { fetchBoardingHouses, type BoardingHouse } from "../api/boarding-house";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { getApiErrorMessage } from "../api/errors";
import { MoneyInput } from "../components/MoneyInput";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";

type StatusFilter = "ALL" | RoomDto["status"];

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [houseFilter, setHouseFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    houseId: "",
    code: "",
    rentAmount: "",
  });
  const [editingRoom, setEditingRoom] = useState<{ id: string; code: string; rentAmount: string } | null>(null);
  const [updateForm, setUpdateForm] = useState({ code: "", rentAmount: "" });

  const { data: rooms, isLoading, error } = useQuery<RoomDto[]>({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const { data: houses } = useQuery<BoardingHouse[]>({
    queryKey: ["boarding-houses"],
    queryFn: fetchBoardingHouses,
  });

  const houseName = (houseId: string) => houses?.find((h) => h.id === houseId)?.name ?? "—";

  const createMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowCreate(false);
      setCreateForm({ houseId: "", code: "", rentAmount: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { code: string; rentAmount: number } }) =>
      updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setEditingRoom(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });

  const openEdit = (room: RoomDto) => {
    setEditingRoom({ id: room.id, code: room.code, rentAmount: String(room.rentAmount) });
    setUpdateForm({ code: room.code, rentAmount: String(room.rentAmount) });
  };

  const handleCreate = () => {
    createMutation.mutate({
      houseId: createForm.houseId,
      code: createForm.code.trim(),
      rentAmount: Number(createForm.rentAmount),
    });
  };

  const handleUpdate = () => {
    if (!editingRoom) return;
    updateMutation.mutate({
      id: editingRoom.id,
      data: {
        code: updateForm.code.trim(),
        rentAmount: Number(updateForm.rentAmount),
      },
    });
  };

  const filteredRooms = rooms?.filter(
    (room) =>
      (statusFilter === "ALL" || room.status === statusFilter) &&
      (houseFilter === "ALL" || room.houseId === houseFilter) &&
      matchesTerm(searchTerm, room.code, houseName(room.houseId), room.contract?.tenant?.name),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách phòng...</div>
      </div>
    );
  }

  return (
    <div>
      <header className="min-h-[104px] flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-[clamp(20px,4vw,52px)] py-[22px] border-b border-border bg-white/88 backdrop-blur-[10px]">
        <div>
          <p className="m-0 mb-1.5 text-teal text-[0.75rem] font-extrabold tracking-widest uppercase">
            Nhà trọ An Tâm
          </p>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">
            Quản lý phòng
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2.5 text-[0.8rem] font-bold text-slate w-full md:w-auto">
            Cơ sở
            <select
              value={houseFilter}
              onChange={(e) => setHouseFilter(e.target.value)}
              className="border border-border rounded-btn bg-white px-3 w-full md:w-auto md:min-w-[165px] h-[44px] text-slate font-normal focus:outline-none focus:ring-2 focus:ring-blue/30"
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

      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách phòng</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">Theo dõi tình trạng và người thuê hiện tại.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Thêm phòng
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5 mb-[18px]">
          {(
            [
              ["ALL", "Tất cả"],
              ["OCCUPIED", "Đang thuê"],
              ["VACANT", "Còn trống"],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`min-h-[40px] border rounded-full px-3.5 font-bold text-[0.78rem] transition-colors ${
                statusFilter === value
                  ? "border-teal bg-teal text-white"
                  : "border-border bg-white text-muted hover:border-slate/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm phòng, khách thuê, cơ sở..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải danh sách phòng: {getApiErrorMessage(error)}</p>
          </div>
        ) : filteredRooms && filteredRooms.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Chưa có phòng nào. Hãy tạo phòng đầu tiên!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms?.map((room) => {
              const isOccupied = room.status === "OCCUPIED";
              return (
                <article key={room.id} className="border border-border rounded-card bg-card shadow-card p-[18px]">
                  <div className="flex justify-between items-start gap-2.5">
                    <h3 className="m-0 text-base font-bold text-slate">Phòng {room.code}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold ${
                        isOccupied ? "bg-[#e6f7f2] text-[#08705f]" : "bg-[#e9f5fb] text-blue"
                      }`}
                    >
                      {isOccupied ? "Đang thuê" : "Còn trống"}
                    </span>
                  </div>

                  <div className="grid gap-2 my-4 text-muted text-[0.82rem]">
                    <span>
                      Cơ sở: <strong className="text-slate font-semibold">{houseName(room.houseId)}</strong>
                    </span>
                    <span>
                      Người thuê: <strong className="text-slate font-bold">{room.contract?.tenant?.name || "—"}</strong>
                    </span>
                    <span>{isOccupied ? "Đã giao hợp đồng" : "Sẵn sàng cho thuê"}</span>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="font-extrabold text-slate text-base">
                      {new Intl.NumberFormat("vi-VN").format(room.rentAmount)} ₫{" "}
                      <small className="text-muted font-normal text-[0.8rem]">/ tháng</small>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(room)}
                        className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa phòng ${room.code}?`)) deleteMutation.mutate(room.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {deleteMutation.isError && (
          <p className="mt-4 text-danger text-sm font-bold">
            {deleteMutation.error && getApiErrorMessage(deleteMutation.error, "Không thể xóa phòng.")}
          </p>
        )}
      </div>

      {showCreate && (
        <Modal title="Thêm phòng mới" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Cơ sở</span>
              <select
                value={createForm.houseId}
                onChange={(e) => setCreateForm({ ...createForm, houseId: e.target.value })}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              >
                <option value="">— Chọn cơ sở —</option>
                {houses?.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Mã phòng</span>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                placeholder="Ví dụ: A101"
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Giá thuê (VNĐ/tháng)</span>
              <MoneyInput
                value={createForm.rentAmount}
                onChange={(raw) => setCreateForm({ ...createForm, rentAmount: raw })}
                placeholder="3000000"
              />
            </label>
            {createMutation.isError && <MutationError error={createMutation.error} />}
            <ModalActions
              onCancel={() => setShowCreate(false)}
              onSubmit={handleCreate}
              pending={createMutation.isPending}
              disabled={!createForm.houseId || !createForm.code.trim() || createForm.rentAmount === ""}
              label="Tạo phòng"
            />
          </div>
        </Modal>
      )}

      {editingRoom && (
        <Modal title="Cập nhật phòng" onClose={() => setEditingRoom(null)}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Mã phòng</span>
              <input
                value={updateForm.code}
                onChange={(e) => setUpdateForm({ ...updateForm, code: e.target.value })}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Giá thuê (VNĐ/tháng)</span>
              <MoneyInput
                value={updateForm.rentAmount}
                onChange={(raw) => setUpdateForm({ ...updateForm, rentAmount: raw })}
              />
            </label>
            {updateMutation.isError && <MutationError error={updateMutation.error} />}
            <ModalActions
              onCancel={() => setEditingRoom(null)}
              onSubmit={handleUpdate}
              pending={updateMutation.isPending}
              disabled={!updateForm.code.trim() || updateForm.rentAmount === ""}
              label="Lưu thay đổi"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

