import apiClient from "./client";

export interface Contract {
  id: string;
  roomId: string;
  tenantId: string;
  startsAt: string;
  endsAt: string | null;
  deposit: number;
  status: "ACTIVE" | "ENDED";
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    code: string;
  };
  tenant?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface CreateContractDto {
  roomId: string;
  tenantId: string;
  startsAt: string;
  deposit: number;
}

export const fetchContracts = async (status?: string): Promise<Contract[]> => {
  const res = await apiClient.get("/contracts", {
    params: status ? { status } : {},
  });
  return res.data;
};

export const fetchContract = async (id: string): Promise<Contract> => {
  const res = await apiClient.get(`/contracts/${id}`);
  return res.data;
};

export const createContract = async (data: CreateContractDto): Promise<Contract> => {
  const res = await apiClient.post("/contracts", data);
  return res.data;
};

export const endContract = async (id: string): Promise<Contract> => {
  const res = await apiClient.post(`/contracts/${id}/end`);
  return res.data;
};
