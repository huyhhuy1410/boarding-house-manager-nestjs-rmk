import { ApiProperty } from '@nestjs/swagger';

export class BoardingHouseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() address!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() electricityUnitPrice!: number;
  @ApiProperty() waterUnitPrice!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export type BoardingHouseResponseSource = {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  electricityUnitPrice: number;
  waterUnitPrice: number;
  createdAt: Date;
  updatedAt: Date;
};

export function mapBoardingHouseResponse(
  house: BoardingHouseResponseSource,
): BoardingHouseResponseDto {
  return {
    id: house.id,
    name: house.name,
    address: house.address,
    ownerId: house.ownerId,
    electricityUnitPrice: house.electricityUnitPrice,
    waterUnitPrice: house.waterUnitPrice,
    createdAt: house.createdAt,
    updatedAt: house.updatedAt,
  };
}
