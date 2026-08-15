import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '../../generated/prisma/client';

export class ContractResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() roomId!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endsAt!: Date | null;
  @ApiProperty() deposit!: number;
  @ApiProperty({ enum: ContractStatus }) status!: ContractStatus;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;

  @ApiPropertyOptional()
  room?: {
    id: string;
    code: string;
  };

  @ApiPropertyOptional()
  tenant?: {
    id: string;
    name: string;
    phone: string;
  };
}

export type ContractResponseSource = {
  id: string;
  roomId: string;
  tenantId: string;
  startsAt: Date;
  endsAt: Date | null;
  deposit: number;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
  room?: {
    id: string;
    code: string;
  };
  tenant?: {
    id: string;
    name: string;
    phone: string;
  };
};

export function mapContractResponse(
  contract: ContractResponseSource,
): ContractResponseDto {
  return {
    id: contract.id,
    roomId: contract.roomId,
    tenantId: contract.tenantId,
    startsAt: contract.startsAt,
    endsAt: contract.endsAt,
    deposit: contract.deposit,
    status: contract.status,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    room: contract.room,
    tenant: contract.tenant,
  };
}
