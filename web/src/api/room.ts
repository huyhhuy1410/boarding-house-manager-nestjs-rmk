import apiClient from "./client";
import type { CreateRoomDto, UpdateRoomDto, RoomDto } from "../types/room";

export const fetchRooms = async (): Promise<RoomDto[]> => {
  const res = await apiClient.get("/rooms");
  return res.data;
};

export const fetchRoom = async (id: string): Promise<RoomDto> => {
  const res = await apiClient.get(`/rooms/${id}`);
  return res.data;
};

export const createRoom = async (data: CreateRoomDto): Promise<RoomDto> => {
  const res = await apiClient.post("/rooms", data);
  return res.data;
};

export const updateRoom = async (
  id: string,
  data: UpdateRoomDto,
): Promise<RoomDto> => {
  const res = await apiClient.patch(`/rooms/${id}`, data);
  return res.data;
};

export const deleteRoom = async (id: string): Promise<void> => {
  await apiClient.delete(`/rooms/${id}`);
};
