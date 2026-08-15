import { ApiProperty } from '@nestjs/swagger';

export class MeterReadingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() roomId!: string;
  @ApiProperty() month!: number;
  @ApiProperty() year!: number;
  @ApiProperty() electricity!: number;
  @ApiProperty() water!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export type MeterReadingResponseSource = {
  id: string;
  roomId: string;
  month: number;
  year: number;
  electricity: number;
  water: number;
  createdAt: Date;
  updatedAt: Date;
};

export function mapMeterReadingResponse(
  reading: MeterReadingResponseSource,
): MeterReadingResponseDto {
  return {
    id: reading.id,
    roomId: reading.roomId,
    month: reading.month,
    year: reading.year,
    electricity: reading.electricity,
    water: reading.water,
    createdAt: reading.createdAt,
    updatedAt: reading.updatedAt,
  };
}
