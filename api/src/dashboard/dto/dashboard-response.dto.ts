import { ApiProperty } from '@nestjs/swagger';
import { ContractResponseDto } from '../../contracts/dto/contract-response.dto';
import { InvoiceResponseDto } from '../../invoices/dto/invoice-response.dto';

export class DashboardResponseDto {
  @ApiProperty({ description: 'Rooms across every boarding house owned.' })
  totalRooms!: number;

  @ApiProperty({ description: 'Rooms with status OCCUPIED.' })
  occupiedRooms!: number;

  @ApiProperty({ description: 'Rooms with status VACANT.' })
  vacantRooms!: number;

  @ApiProperty({
    description: 'Occupied rooms as a rounded percentage (0-100).',
    example: 75,
  })
  occupancyRate!: number;

  @ApiProperty({
    description: 'Sum of every PAID invoice total, in VND.',
    example: 12500000,
  })
  totalRevenue!: number;

  @ApiProperty({ description: 'Invoices with status ISSUED, awaiting payment.' })
  pendingInvoices!: number;

  @ApiProperty({ description: 'Invoices with status PAID.' })
  paidInvoices!: number;

  @ApiProperty({ description: 'Contracts with status ACTIVE.' })
  activeContracts!: number;

  @ApiProperty({
    type: () => InvoiceResponseDto,
    isArray: true,
    description: 'Up to 5 ISSUED invoices, nearest due date first.',
  })
  dueInvoices!: InvoiceResponseDto[];

  @ApiProperty({
    type: () => ContractResponseDto,
    isArray: true,
    description: 'Up to 5 ACTIVE contracts ending in the future, soonest first.',
  })
  expiringContracts!: ContractResponseDto[];
}
