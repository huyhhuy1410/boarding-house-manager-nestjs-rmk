import apiClient from "./client";

export type ExpenseCategory = "MAINTENANCE" | "UTILITIES" | "OTHER";

export interface Expense {
  id: string;
  boardingHouseId: string;
  maintenanceRequestId: string | null;
  category: ExpenseCategory;
  title: string;
  description: string | null;
  amount: number;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
  boardingHouse?: { id: string; name: string };
  maintenanceRequest?: { id: string; title: string } | null;
}

export interface CreateExpenseDto {
  boardingHouseId: string;
  maintenanceRequestId?: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  spentAt: string;
}

export const fetchExpenses = async (): Promise<Expense[]> => {
  const res = await apiClient.get("/expenses");
  return res.data;
};

export const fetchExpense = async (id: string): Promise<Expense> => {
  const res = await apiClient.get(`/expenses/${id}`);
  return res.data;
};

export const createExpense = async (
  data: CreateExpenseDto,
): Promise<Expense> => {
  const res = await apiClient.post("/expenses", data);
  return res.data;
};
