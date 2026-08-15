import apiClient from "./client";

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  identityNumber: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  name: string;
  phone: string;
  identityNumber?: string;
}

export interface UpdateTenantDto {
  name?: string;
  phone?: string;
  identityNumber?: string;
}

export const fetchTenants = async (): Promise<Tenant[]> => {
  const res = await apiClient.get("/tenants");
  return res.data;
};

export const fetchTenant = async (id: string): Promise<Tenant> => {
  const res = await apiClient.get(`/tenants/${id}`);
  return res.data;
};

export const createTenant = async (data: CreateTenantDto): Promise<Tenant> => {
  const res = await apiClient.post("/tenants", data);
  return res.data;
};

export const updateTenant = async (
  id: string,
  data: UpdateTenantDto,
): Promise<Tenant> => {
  const res = await apiClient.patch(`/tenants/${id}`, data);
  return res.data;
};

export const deleteTenant = async (id: string): Promise<void> => {
  await apiClient.delete(`/tenants/${id}`);
};
