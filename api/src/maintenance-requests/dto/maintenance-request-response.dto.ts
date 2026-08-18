import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceRequestChargeTo,
  MaintenanceRequestStatus,
} from '../../generated/prisma/client';

export class MaintenanceRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() roomId!: string;
  @ApiPropertyOptional({ nullable: true }) tenantId!: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Tenant snapshot for display; null when the request has no tenant.',
  })
  tenant?: { id: string; name: string } | null;
  @ApiProperty({ enum: MaintenanceRequestStatus })
  status!: MaintenanceRequestStatus;
  @ApiPropertyOptional({ enum: MaintenanceRequestChargeTo, nullable: true })
  chargeTo!: MaintenanceRequestChargeTo | null;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({ nullable: true }) estimatedCost!: number | null;
  @ApiPropertyOptional({ nullable: true }) actualCost!: number | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  resolvedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export type MaintenanceRequestResponseSource = {
  id: string;
  roomId: string;
  tenantId: string | null;
  status: MaintenanceRequestStatus;
  chargeTo: MaintenanceRequestChargeTo | null;
  title: string;
  description: string;
  estimatedCost: number | null;
  actualCost: number | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tenant?: { id: string; name: string } | null;
};

export function mapMaintenanceRequestResponse(
  request: MaintenanceRequestResponseSource,
): MaintenanceRequestResponseDto {
  return {
    id: request.id,
    roomId: request.roomId,
    tenantId: request.tenantId,
    tenant: request.tenant,
    status: request.status,
    chargeTo: request.chargeTo,
    title: request.title,
    description: request.description,
    estimatedCost: request.estimatedCost,
    actualCost: request.actualCost,
    resolvedAt: request.resolvedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
