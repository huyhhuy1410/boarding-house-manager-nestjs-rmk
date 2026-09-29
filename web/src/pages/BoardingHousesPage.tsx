import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { getApiErrorMessage } from "../api/errors";
import { MoneyInput } from "../components/MoneyInput";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";
import {
  createBoardingHouse,
  deleteBoardingHouse,
  fetchBoardingHouses,
  updateBoardingHouse,
  type BoardingHouse,
  type CreateBoardingHouseDto,
  type UpdateBoardingHouseDto,
} from "../api/boarding-house";

const emptyCreateForm: CreateBoardingHouseDto = {
  name: "",
  address: "",
};

export default function BoardingHousesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBoardingHouseDto>(emptyCreateForm);
  const [editingHouse, setEditingHouse] = useState<BoardingHouse | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateBoardingHouseDto>({});
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: houses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["boarding-houses"],
    queryFn: fetchBoardingHouses,
  });

  const filteredHouses = houses?.filter((house) =>
    matchesTerm(searchTerm, house.name, house.address),
  );

  const createMutation = useMutation({
    mutationFn: createBoardingHouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boarding-houses"] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBoardingHouseDto }) =>
      updateBoardingHouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boarding-houses"] });
      setEditingHouse(null);
      setUpdateForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBoardingHouse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boarding-houses"] }),
  });

  const openEdit = (house: BoardingHouse) => {
    setEditingHouse(house);
    setUpdateForm({
      name: house.name,
      address: house.address,
      electricityUnitPrice: house.electricityUnitPrice,
      waterUnitPrice: house.waterUnitPrice,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: createForm.name.trim(),
      address: createForm.address.trim(),
    });
  };

  const handleUpdate = () => {
    if (!editingHouse) return;
    updateMutation.mutate({
      id: editingHouse.id,
      data: {
        ...updateForm,
        name: updateForm.name?.trim(),
        address: updateForm.address?.trim(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách cơ sở...</div>
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
            Quản lý cơ sở
          </h1>
        </div>
      </header>

      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách cơ sở</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">Quản lý các cơ sở nhà trọ và giá điện nước mặc định.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Thêm cơ sở
          </button>
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm tên hoặc địa chỉ cơ sở..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {getApiErrorMessage(error)}</p>
          </div>
        ) : filteredHouses && filteredHouses.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">
              {searchTerm.trim() ? "Không tìm thấy cơ sở nào." : "Chưa có cơ sở nào. Hãy tạo cơ sở đầu tiên!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHouses?.map((house) => (
              <article key={house.id} className="border border-border rounded-card bg-card shadow-card p-[18px]">
                <div className="flex justify-between items-start gap-2.5">
                  <h3 className="m-0 text-base font-bold text-slate">{house.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(house)}
                      className="text-[0.75rem] font-bold text-teal hover:text-teal-dark"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa cơ sở "${house.name}"?`)) deleteMutation.mutate(house.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-[0.75rem] font-bold text-danger hover:text-red-700 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <p className="mt-2 mb-3 text-muted text-[0.82rem]">{house.address}</p>
                <div className="border-t border-border pt-3 text-[0.8rem] text-slate">
                  <div className="flex justify-between py-1">
                    <span className="text-muted">Giá điện</span>
                    <strong className="font-bold">{new Intl.NumberFormat("vi-VN").format(house.electricityUnitPrice)} ₫/kWh</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted">Giá nước</span>
                    <strong className="font-bold">{new Intl.NumberFormat("vi-VN").format(house.waterUnitPrice)} ₫/m³</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {deleteMutation.isError && (
          <p className="mt-4 text-danger text-sm font-bold">
            {deleteMutation.error && getApiErrorMessage(deleteMutation.error, "Không thể xóa cơ sở.")}
          </p>
        )}
      </div>

      {showCreate && (
        <Modal title="Thêm cơ sở mới" onClose={() => setShowCreate(false)}>
          <FormFields
            name={createForm.name}
            address={createForm.address}
            onNameChange={(name) => setCreateForm({ ...createForm, name })}
            onAddressChange={(address) => setCreateForm({ ...createForm, address })}
          />
          {createMutation.isError && <MutationError error={createMutation.error} />}
          <ModalActions
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
            pending={createMutation.isPending}
            disabled={!createForm.name.trim() || !createForm.address.trim()}
            label="Tạo cơ sở"
          />
        </Modal>
      )}

      {editingHouse && (
        <Modal title="Cập nhật cơ sở" onClose={() => setEditingHouse(null)}>
          <FormFields
            name={updateForm.name ?? ""}
            address={updateForm.address ?? ""}
            electricityUnitPrice={updateForm.electricityUnitPrice}
            waterUnitPrice={updateForm.waterUnitPrice}
            showPrices
            onNameChange={(name) => setUpdateForm({ ...updateForm, name })}
            onAddressChange={(address) => setUpdateForm({ ...updateForm, address })}
            onElectricityPriceChange={(electricityUnitPrice) => setUpdateForm({ ...updateForm, electricityUnitPrice })}
            onWaterPriceChange={(waterUnitPrice) => setUpdateForm({ ...updateForm, waterUnitPrice })}
          />
          {updateMutation.isError && <MutationError error={updateMutation.error} />}
          <ModalActions
            onCancel={() => setEditingHouse(null)}
            onSubmit={handleUpdate}
            pending={updateMutation.isPending}
            disabled={!updateForm.name?.trim() || !updateForm.address?.trim()}
            label="Lưu thay đổi"
          />
        </Modal>
      )}
    </div>
  );
}

function FormFields({
  name,
  address,
  electricityUnitPrice,
  waterUnitPrice,
  showPrices = false,
  onNameChange,
  onAddressChange,
  onElectricityPriceChange,
  onWaterPriceChange,
}: {
  name: string;
  address: string;
  electricityUnitPrice?: number;
  waterUnitPrice?: number;
  showPrices?: boolean;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onElectricityPriceChange?: (value: number | undefined) => void;
  onWaterPriceChange?: (value: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8rem] font-bold text-slate">Tên cơ sở</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8rem] font-bold text-slate">Địa chỉ</span>
        <input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate"
          required
        />
      </label>
      {showPrices && (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.8rem] font-bold text-slate">Giá điện (VNĐ/kWh)</span>
            <MoneyInput
              value={electricityUnitPrice === undefined ? "" : String(electricityUnitPrice)}
              onChange={(raw) => onElectricityPriceChange?.(raw === "" ? undefined : Number(raw))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.8rem] font-bold text-slate">Giá nước (VNĐ/m³)</span>
            <MoneyInput
              value={waterUnitPrice === undefined ? "" : String(waterUnitPrice)}
              onChange={(raw) => onWaterPriceChange?.(raw === "" ? undefined : Number(raw))}
            />
          </label>
        </div>
      )}
    </div>
  );
}

