import apiClient from "./client";
import type { RoomDto } from "../types/room";
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

export const fetchDashboardData = async (): Promise<DashboardData> => {
  // Fetch data from multiple endpoints and aggregate
  const [rooms, invoices, contracts] = await Promise.all([
    apiClient.get("/rooms"),
    apiClient.get("/invoices"),
    apiClient.get("/contracts"),
  ]);

  const roomData = rooms.data as RoomDto[];
  const invoiceData = invoices.data as Invoice[];
  const contractData = contracts.data as Contract[];

  const totalRooms = roomData.length;
  const occupiedRooms = roomData.filter((room) => room.status === "OCCUPIED").length;
  const vacantRooms = totalRooms - occupiedRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const paidInvoices = invoiceData.filter((invoice) => invoice.status === "PAID");
  const pendingInvoices = invoiceData.filter((invoice) => invoice.status === "ISSUED");
  const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const activeContracts = contractData.filter((contract) => contract.status === "ACTIVE").length;

  const dueInvoices = [...pendingInvoices]
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 5);

  const now = Date.now();
  const expiringContracts = contractData
    .filter((contract) =>
      contract.status === "ACTIVE" &&
      contract.endsAt != null &&
      new Date(contract.endsAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.endsAt!).getTime() - new Date(b.endsAt!).getTime(),
    )
    .slice(0, 5);

  return {
    totalRooms,
    occupiedRooms,
    vacantRooms,
    occupancyRate,
    totalRevenue,
    pendingInvoices: pendingInvoices.length,
    paidInvoices: paidInvoices.length,
    activeContracts,
    dueInvoices,
    expiringContracts,
  };
};
