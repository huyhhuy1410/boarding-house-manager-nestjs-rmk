export interface RoomDto {
  id: string;
  code: string;
  status: "VACANT" | "OCCUPIED";
  rentAmount: number;
  houseId: string;
  createdAt: string;
  updatedAt: string;
  contract?: {
    id: string;
    tenant: {
      id: string;
      name: string;
    };
  };
}

export interface CreateRoomDto {
  code: string;
  rentAmount: number;
  houseId: string;
}

export interface UpdateRoomDto {
  code?: string;
  rentAmount?: number;
}
