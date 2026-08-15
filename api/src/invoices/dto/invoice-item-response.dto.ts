import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceItemType } from '../../generated/prisma/client';

export class InvoiceItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: InvoiceItemType })
  type!: InvoiceItemType;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export type InvoiceItemResponseSource = {
  id: string;
  type: InvoiceItemType;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  createdAt: Date;
};

export function mapInvoiceItemResponse(
  item: InvoiceItemResponseSource,
): InvoiceItemResponseDto {
  return {
    id: item.id,
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    createdAt: item.createdAt,
  };
}
