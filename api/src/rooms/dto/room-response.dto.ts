import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '../../generated/prisma/client';

export class RoomResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: RoomStatus }) status!: RoomStatus;
  @ApiProperty() rentAmount!: number;
  @ApiProperty() houseId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;

  @ApiPropertyOptional()
  contract?: {
    id: string;
    tenant: {
      id: string;
      name: string;
    };
  };
}

export type RoomResponseSource = {
  id: string;
  code: string;
  status: RoomStatus;
  rentAmount: number;
  houseId: string;
  createdAt: Date;
  updatedAt: Date;
  contract?: {
    id: string;
    tenant: {
      id: string;
      name: string;
    };
  };
};

export function mapRoomResponse(room: RoomResponseSource): RoomResponseDto {
  return {
    id: room.id,
    code: room.code,
    status: room.status,
    rentAmount: room.rentAmount,
    houseId: room.houseId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    contract: room.contract,
  };
}