import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { fetchRooms } from "../api/room";
import { fetchMeterReadings, createMeterReading, type CreateMeterReadingDto } from "../api/meter-reading";

interface CreateFormState {
  roomId: string;
  month: number;
  year: number;
  electricity: string;
  water: string;
}

const emptyForm = (roomId: string): CreateFormState => ({
  roomId,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  electricity: "",
  water: "",
});

export default function MeterReadingsPage() {
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFormState>(() => emptyForm(""));

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const {
    data: readings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["meter-readings", selectedRoomId],
    queryFn: () => fetchMeterReadings({ roomId: selectedRoomId }),
    enabled: !!selectedRoomId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMeterReadingDto) => createMeterReading(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meter-readings", selectedRoomId] });
      setShowForm(false);
      setForm(emptyForm(selectedRoomId));
    },
  });

  const openCreate = () => {
    setForm(emptyForm(selectedRoomId));
    setShowForm(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      roomId: form.roomId,
      month: Number(form.month),
      year: Number(form.year),
      electricity: Number(form.electricity),
      water: Number(form.water),
    });
  };

  const createDisabled =
    !form.roomId ||
    !form.month ||
    !form.year ||
    form.year < 2000 ||
    form.electricity === "" ||
    form.water === "" ||
    Number(form.electricity) < 0 ||
    Number(form.water) < 0;

  return (
    <div>
      {/* Topbar */}
      <header className="min-h-[104px] flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-[clamp(20px,4vw,52px)] py-[22px] border-b border-border bg-white/88 backdrop-blur-[10px]">
        <div>
          <p className="m-0 mb-1.5 text-teal text-[0.75rem] font-extrabold tracking-widest uppercase">
            Nhà trọ An Tâm
          </p>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">
            Chỉ số điện nước
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách chỉ số</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">Xem chỉ số điện nước theo từng phòng.</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Ghi chỉ số mới
          </button>
        </div>

        {/* Room Selector */}
        <div className="mb-5">
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-bold text-slate">
            Chọn phòng
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="border border-border rounded-btn bg-white px-3 w-full md:min-w-[220px] h-[44px] text-slate font-normal focus:outline-none focus:ring-2 focus:ring-teal/30"
            >
              <option value="">— Chọn phòng —</option>
              {rooms?.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} {room.contract?.tenant?.name ? `(${room.contract.tenant.name})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Readings Table */}
        {!selectedRoomId ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Vui lòng chọn một phòng để xem chỉ số điện nước.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-muted text-sm font-semibold">Đang tải chỉ số...</div>
          </div>
        ) : error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {(error as Error).message}</p>
          </div>
        ) : readings && readings.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">Chưa có chỉ số nào cho phòng này.</p>
          </div>
        ) : (
          <div className="border border-border rounded-card bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-[#fdfdfd]">
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Kỳ</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Điện (kWh)</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Nước (m³)</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Ngày ghi</th>
                  </tr>
                </thead>
                <tbody>
                  {readings?.map((reading) => (
                    <tr key={reading.id} className="border-b border-border last:border-b-0 hover:bg-[#f3f7f6]/50">
                      <td className="p-[15px_13px] text-[0.85rem] font-bold text-slate">
                        {reading.month}/{reading.year}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">
                        {reading.electricity.toLocaleString("vi-VN")}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">
                        {reading.water.toLocaleString("vi-VN")}
                      </td>
                      <td className="p-[15px_13px] text-[0.82rem] text-muted">
                        {new Date(reading.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <Modal title="Ghi chỉ số mới" onClose={() => setShowForm(false)}>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8rem] font-bold text-slate">Phòng</span>
              <select
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
              >
                <option value="">— Chọn phòng —</option>
                {rooms?.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} {room.contract?.tenant?.name ? `(${room.contract.tenant.name})` : ""}
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
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Năm</span>
                <input
                  type="number"
                  min={2000}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Điện (kWh)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.electricity}
                  onChange={(e) => setForm({ ...form, electricity: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-slate">Nước (m³)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.water}
                  onChange={(e) => setForm({ ...form, water: e.target.value })}
                  className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
                  required
                />
              </label>
            </div>
          </div>
          {createMutation.isError && <MutationError error={createMutation.error} />}
          <ModalActions
            onCancel={() => setShowForm(false)}
            onSubmit={handleCreate}
            pending={createMutation.isPending}
            disabled={createDisabled}
            label="Ghi chỉ số"
          />
        </Modal>
      )}
    </div>
  );
}
