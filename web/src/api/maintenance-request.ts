import apiClient from "./client";

export type MaintenanceStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
export type MaintenanceChargeTo = "TENANT" | "OWNER";

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  tenantId: string | null;
  tenant?: { id: string; name: string } | null;
  status: MaintenanceStatus;
  chargeTo: MaintenanceChargeTo | null;
  title: string;
  description: string;
  estimatedCost: number | null;
  actualCost: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceRequestDto {
  roomId: string;
  tenantId?: string;
  title: string;
  description: string;
}

export interface ResolveMaintenanceRequestDto {
  chargeTo: MaintenanceChargeTo;
  estimatedCost?: number;
  actualCost?: number;
}

export const fetchMaintenanceRequests = async (): Promise<MaintenanceRequest[]> => {
  const res = await apiClient.get("/maintenance-requests");
  return res.data;
};

export const fetchMaintenanceRequest = async (id: string): Promise<MaintenanceRequest> => {
  const res = await apiClient.get(`/maintenance-requests/${id}`);
  return res.data;
};

export const createMaintenanceRequest = async (
  data: CreateMaintenanceRequestDto,
): Promise<MaintenanceRequest> => {
  const res = await apiClient.post("/maintenance-requests", data);
  return res.data;
};

export const startMaintenanceRequest = async (id: string): Promise<MaintenanceRequest> => {
  const res = await apiClient.patch(`/maintenance-requests/${id}/start`);
  return res.data;
};

export const resolveMaintenanceRequest = async (
  id: string,
  data: ResolveMaintenanceRequestDto,
): Promise<MaintenanceRequest> => {
  const res = await apiClient.patch(`/maintenance-requests/${id}/resolve`, data);
  return res.data;
};

export const cancelMaintenanceRequest = async (id: string): Promise<MaintenanceRequest> => {
  const res = await apiClient.patch(`/maintenance-requests/${id}/cancel`);
  return res.data;
};

export const deleteMaintenanceRequest = async (id: string): Promise<MaintenanceRequest> => {
  const res = await apiClient.delete(`/maintenance-requests/${id}`);
  return res.data;
};
