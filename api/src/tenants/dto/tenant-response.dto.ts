import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional({ nullable: true }) identityNumber!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export type TenantResponseSource = {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  identityNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapTenantResponse(
  tenant: TenantResponseSource,
): TenantResponseDto {
  return {
    id: tenant.id,
    ownerId: tenant.ownerId,
    name: tenant.name,
    phone: tenant.phone,
    identityNumber: tenant.identityNumber,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}
