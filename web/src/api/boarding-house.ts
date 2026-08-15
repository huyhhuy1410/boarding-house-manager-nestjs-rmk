import apiClient from "./client";

export interface BoardingHouse {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  electricityUnitPrice: number;
  waterUnitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardingHouseDto {
  name: string;
  address: string;
}

export interface UpdateBoardingHouseDto {
  name?: string;
  address?: string;
  electricityUnitPrice?: number;
  waterUnitPrice?: number;
}

export const fetchBoardingHouses = async (): Promise<BoardingHouse[]> => {
  const res = await apiClient.get("/boarding-houses");
  return res.data;
};

export const fetchBoardingHouse = async (id: string): Promise<BoardingHouse> => {
  const res = await apiClient.get(`/boarding-houses/${id}`);
  return res.data;
};

export const createBoardingHouse = async (data: CreateBoardingHouseDto): Promise<BoardingHouse> => {
  const res = await apiClient.post("/boarding-houses", data);
  return res.data;
};

export const updateBoardingHouse = async (
  id: string,
  data: UpdateBoardingHouseDto,
): Promise<BoardingHouse> => {
  const res = await apiClient.patch(`/boarding-houses/${id}`, data);
  return res.data;
};

export const deleteBoardingHouse = async (id: string): Promise<void> => {
  await apiClient.delete(`/boarding-houses/${id}`);
};
