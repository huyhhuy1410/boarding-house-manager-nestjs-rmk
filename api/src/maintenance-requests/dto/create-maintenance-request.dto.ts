import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaintenanceRequestDto {
  @ApiProperty({ example: 'cmroom123' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiPropertyOptional({ example: 'cmtenant123' })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ example: 'Broken faucet' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'The faucet is leaking.' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
