import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBoardingHouseDto {
  @ApiPropertyOptional({ example: 'An Tam Boarding House' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '123 Nguyen Trai, District 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 3500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  electricityUnitPrice?: number;

  @ApiPropertyOptional({ example: 30000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  waterUnitPrice?: number;
}
