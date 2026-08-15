import apiClient from "./client";

export interface MeterReading {
  id: string;
  roomId: string;
  month: number;
  year: number;
  electricity: number;
  water: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeterReadingDto {
  roomId: string;
  month: number;
  year: number;
  electricity: number;
  water: number;
}

export interface GetMeterReadingsParams {
  roomId: string;
  month?: number;
  year?: number;
}

export const fetchMeterReadings = async (
  params: GetMeterReadingsParams,
): Promise<MeterReading[]> => {
  const res = await apiClient.get("/meter-readings", { params });
  return res.data;
};

export const createMeterReading = async (
  data: CreateMeterReadingDto,
): Promise<MeterReading> => {
  const res = await apiClient.post("/meter-readings", data);
  return res.data;
};
