import apiClient from "./client";

export interface Invoice {
  id: string;
  contractId: string;
  month: number;
  year: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  rentAmount: number;
  electricityUsage: number;
  electricityUnitPrice: number;
  waterUsage: number;
  waterUnitPrice: number;
  total: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
  contract?: {
    id: string;
    tenant: {
      id: string;
      name: string;
      phone: string;
    };
    room: {
      id: string;
      code: string;
    };
  };
}

export interface InvoiceItem {
  id: string;
  type: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  createdAt: string;
}

export interface CreateInvoiceDto {
  contractId: string;
  month: number;
  year: number;
}

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const res = await apiClient.get("/invoices");
  return res.data;
};

export const fetchInvoice = async (id: string): Promise<Invoice> => {
  const res = await apiClient.get(`/invoices/${id}`);
  return res.data;
};

export const createInvoice = async (data: CreateInvoiceDto): Promise<Invoice> => {
  const res = await apiClient.post("/invoices", data);
  return res.data;
};

export const issueInvoice = async (id: string): Promise<Invoice> => {
  const res = await apiClient.post(`/invoices/${id}/issue`);
  return res.data;
};

export const payInvoice = async (id: string): Promise<Invoice> => {
  const res = await apiClient.post(`/invoices/${id}/pay`);
  return res.data;
};

export const voidInvoice = async (id: string): Promise<Invoice> => {
  const res = await apiClient.post(`/invoices/${id}/void`);
  return res.data;
};

