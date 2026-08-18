import apiClient from "./client";
import type { Invoice } from "./invoice";
import type { Contract } from "./contract";

export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  totalRevenue: number;
  pendingInvoices: number;
  paidInvoices: number;
  activeContracts: number;
}

export interface DashboardData extends DashboardStats {
  dueInvoices: Invoice[];
  expiringContracts: Contract[];
}

// Aggregated server-side by GET /dashboard (Prisma groupBy/count/sum) so the
// browser no longer downloads every room, invoice and contract to add them up.
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const res = await apiClient.get("/dashboard");
  return res.data;
};
