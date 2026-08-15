import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetMeterReadingsQueryDto {
  @ApiProperty({ example: 'cmroom123' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ example: 2026, minimum: 2000 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;
}
