import { IsEnum, IsInt, Min, IsOptional } from 'class-validator';
import { MaintenanceRequestChargeTo } from '../../generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveMaintenanceRequestDto {
  @ApiProperty({
    enum: MaintenanceRequestChargeTo,
    example: MaintenanceRequestChargeTo.TENANT,
  })
  @IsEnum(MaintenanceRequestChargeTo)
  chargeTo!: MaintenanceRequestChargeTo;

  @ApiPropertyOptional({ example: 200000, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 150000, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  actualCost?: number;
}
