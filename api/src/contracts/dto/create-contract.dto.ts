import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ example: 'cmroom123' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({ example: 'cmtenant123' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z', format: 'date-time' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: 3000000, minimum: 0 })
  @IsInt()
  @Min(0)
  deposit!: number;
}
