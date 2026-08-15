import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalActions, MutationError } from "../components/Modal";
import { SearchInput } from "../components/SearchInput";
import { matchesTerm } from "../components/search";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  createTenant,
  deleteTenant,
  fetchTenants,
  updateTenant,
  type CreateTenantDto,
  type Tenant,
  type UpdateTenantDto,
} from "../api/tenant";

const emptyForm: CreateTenantDto = {
  name: "",
  phone: "",
};

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTenantDto>(emptyForm);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateTenantDto>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { data: tenants, isLoading, error } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: fetchTenants,
  });

  const filteredTenants = tenants?.filter((tenant) =>
    matchesTerm(searchTerm, tenant.name, tenant.phone, tenant.identityNumber),
  );

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setShowCreate(false);
      setCreateForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDto }) =>
      updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setEditingTenant(null);
      setUpdateForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });

  const openEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setUpdateForm({
      name: tenant.name,
      phone: tenant.phone,
      identityNumber: tenant.identityNumber ?? undefined,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: createForm.name.trim(),
      phone: createForm.phone.trim(),
      identityNumber: createForm.identityNumber?.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingTenant) return;
    updateMutation.mutate({
      id: editingTenant.id,
      data: {
        name: updateForm.name?.trim(),
        phone: updateForm.phone?.trim(),
        identityNumber: updateForm.identityNumber?.trim() || undefined,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted text-sm font-semibold">Đang tải danh sách người thuê...</div>
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
          <h1 className="text-[1.65rem] font-bold tracking-tight text-slate m-0">Quản lý khách thuê</h1>
        </div>
      </header>

      <div className="p-[30px_clamp(20px,4vw,52px)_56px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h2 className="m-0 text-[1.15rem] font-bold text-slate">Danh sách khách thuê</h2>
            <p className="m-0 mt-1 text-muted text-[0.83rem]">Quản lý thông tin liên hệ và CCCD của người thuê.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 border border-transparent rounded-btn px-4 bg-teal text-white font-bold text-sm min-h-[44px] hover:bg-teal-dark transition-colors"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Thêm khách thuê
          </button>
        </div>

        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm tên, số điện thoại, CCCD..."
          />
        </div>

        {error ? (
          <div className="bg-[#fff5f4] border border-[#ffd5d2] rounded-btn p-4">
            <p className="text-danger text-sm font-bold m-0">Không thể tải dữ liệu: {(error as Error).message}</p>
          </div>
        ) : filteredTenants && filteredTenants.length === 0 ? (
          <div className="bg-card border border-border rounded-card p-12 text-center shadow-card">
            <p className="text-muted text-sm m-0">
              {searchTerm.trim() ? "Không tìm thấy khách thuê nào." : "Chưa có thông tin khách thuê nào."}
            </p>
          </div>
        ) : (
          isMobile ? (
            <div className="flex flex-col gap-3">
              {filteredTenants?.map((tenant) => (
                <article key={tenant.id} className="border border-border rounded-card bg-card shadow-card p-4">
                  <div className="flex justify-between items-start gap-2.5">
                    <h3 className="m-0 text-base font-bold text-slate">{tenant.name}</h3>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(tenant)}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa khách thuê "${tenant.name}"?`)) deleteMutation.mutate(tenant.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="px-3 min-h-[40px] text-[0.75rem] font-bold border border-border rounded-btn text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1.5 text-[0.82rem] text-muted">
                    <span>
                      Số điện thoại: <strong className="text-slate font-semibold">{tenant.phone}</strong>
                    </span>
                    <span>
                      CCCD / CMND: <strong className="text-slate font-semibold">{tenant.identityNumber || "—"}</strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
          <div className="border border-border rounded-card bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-[#fdfdfd]">
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Họ và tên</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">Số điện thoại</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold">CCCD / CMND</th>
                    <th className="p-[15px_13px] text-muted text-[0.72rem] uppercase tracking-wider font-extrabold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants?.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-border last:border-b-0 hover:bg-[#f3f7f6]/50">
                      <td className="p-[15px_13px] text-[0.85rem] font-bold text-slate">{tenant.name}</td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">{tenant.phone}</td>
                      <td className="p-[15px_13px] text-[0.82rem] text-slate">{tenant.identityNumber || "—"}</td>
                      <td className="p-[15px_13px] text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(tenant)}
                            className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-teal hover:bg-slate-50 transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa khách thuê "${tenant.name}"?`)) deleteMutation.mutate(tenant.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="px-3 min-h-[36px] text-[0.75rem] font-bold border border-border rounded-btn text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Xóa
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

        {deleteMutation.isError && (
          <p className="mt-4 text-danger text-sm font-bold">{(deleteMutation.error as Error).message || "Không thể xóa khách thuê."}</p>
        )}
      </div>

      {showCreate && (
        <Modal title="Thêm khách thuê" onClose={() => setShowCreate(false)}>
          <TenantFields
            name={createForm.name}
            phone={createForm.phone}
            identityNumber={createForm.identityNumber ?? ""}
            onChange={(field, value) => setCreateForm({ ...createForm, [field]: value })}
          />
          {createMutation.isError && <MutationError error={createMutation.error} />}
          <ModalActions
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
            pending={createMutation.isPending}
            disabled={!createForm.name.trim() || !createForm.phone.trim()}
            label="Tạo khách thuê"
          />
        </Modal>
      )}

      {editingTenant && (
        <Modal title="Cập nhật khách thuê" onClose={() => setEditingTenant(null)}>
          <TenantFields
            name={updateForm.name ?? ""}
            phone={updateForm.phone ?? ""}
            identityNumber={updateForm.identityNumber ?? ""}
            onChange={(field, value) => setUpdateForm({ ...updateForm, [field]: value })}
          />
          {updateMutation.isError && <MutationError error={updateMutation.error} />}
          <ModalActions
            onCancel={() => setEditingTenant(null)}
            onSubmit={handleUpdate}
            pending={updateMutation.isPending}
            disabled={!updateForm.name?.trim() || !updateForm.phone?.trim()}
            label="Lưu thay đổi"
          />
        </Modal>
      )}
    </div>
  );
}

function TenantFields({
  name,
  phone,
  identityNumber,
  onChange,
}: {
  name: string;
  phone: string;
  identityNumber: string;
  onChange: (field: "name" | "phone" | "identityNumber", value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8rem] font-bold text-slate">Họ và tên</span>
        <input value={name} onChange={(e) => onChange("name", e.target.value)} className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8rem] font-bold text-slate">Số điện thoại</span>
        <input value={phone} onChange={(e) => onChange("phone", e.target.value)} className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8rem] font-bold text-slate">CCCD / CMND (tuỳ chọn)</span>
        <input value={identityNumber} onChange={(e) => onChange("identityNumber", e.target.value)} className="border border-border rounded-btn bg-white px-3 h-[44px] text-slate" />
      </label>
    </div>
  );
}
