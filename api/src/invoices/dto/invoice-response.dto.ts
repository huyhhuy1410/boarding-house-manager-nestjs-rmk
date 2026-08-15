import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../../generated/prisma/client';
import {
  InvoiceItemResponseDto,
  InvoiceItemResponseSource,
  mapInvoiceItemResponse,
} from './invoice-item-response.dto';

export class InvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  contractId!: string;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  year!: number;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  rentAmount!: number;

  @ApiProperty()
  electricityUsage!: number;

  @ApiProperty()
  electricityUnitPrice!: number;

  @ApiProperty()
  waterUsage!: number;

  @ApiProperty()
  waterUnitPrice!: number;

  @ApiProperty()
  total!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  issuedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  dueAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: () => InvoiceItemResponseDto, isArray: true })
  items?: InvoiceItemResponseDto[];

  @ApiPropertyOptional()
  contract?: {
    id: string;
    tenant: {
      id: string;
      name: string;
      phone: string;
    };
    room: {
      id: string;
      code: string;
    };
  };
}

export type InvoiceResponseSource = {
  id: string;
  contractId: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  rentAmount: number;
  electricityUsage: number;
  electricityUnitPrice: number;
  waterUsage: number;
  waterUnitPrice: number;
  total: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: InvoiceItemResponseSource[];
  contract?: {
    id: string;
    tenant: {
      id: string;
      name: string;
      phone: string;
    };
    room: {
      id: string;
      code: string;
    };
  };
};

export function mapInvoiceResponse(
  invoice: InvoiceResponseSource,
): InvoiceResponseDto {
  return {
    id: invoice.id,
    contractId: invoice.contractId,
    month: invoice.month,
    year: invoice.year,
    status: invoice.status,
    rentAmount: invoice.rentAmount,
    electricityUsage: invoice.electricityUsage,
    electricityUnitPrice: invoice.electricityUnitPrice,
    waterUsage: invoice.waterUsage,
    waterUnitPrice: invoice.waterUnitPrice,
    total: invoice.total,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    items: invoice.items?.map(mapInvoiceItemResponse),
    contract: invoice.contract,
  };
}
