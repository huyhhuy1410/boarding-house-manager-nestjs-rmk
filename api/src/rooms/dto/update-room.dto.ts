import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'A102' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code?: string;

  @ApiPropertyOptional({ example: 3200000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rentAmount?: number;
}
