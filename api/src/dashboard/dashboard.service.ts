import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContractStatus,
  InvoiceStatus,
  Prisma,
  RoomStatus,
} from '../generated/prisma/client';
import {
  ContractResponseSource,
  mapContractResponse,
} from '../contracts/dto/contract-response.dto';
import {
  InvoiceResponseSource,
  mapInvoiceResponse,
} from '../invoices/dto/invoice-response.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

const DUE_INVOICES_LIMIT = 5;
const EXPIRING_CONTRACTS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getStats(authUserId: string): Promise<DashboardResponseDto> {
    const owner = await this.authService.requireApplicationUser(authUserId);

    // Ownership scoping, kept identical to RoomsService / ContractsService /
    // InvoicesService so the dashboard can never count another owner's data.
    const roomScope: Prisma.RoomWhereInput = {
      house: { ownerId: owner.id },
    };
    const contractScope: Prisma.ContractWhereInput = {
      tenant: { ownerId: owner.id },
      room: { house: { ownerId: owner.id } },
    };
    const invoiceScope: Prisma.InvoiceWhereInput = {
      contract: contractScope,
    };

    const now = new Date();

    // Five independent reads -> one round trip each, all in flight together.
    const [
      roomGroups,
      invoiceGroups,
      activeContracts,
      dueInvoices,
      expiringContracts,
    ] = await Promise.all([
      // groupBy = SELECT status, COUNT(*) ... GROUP BY status.
      // One query answers total / occupied / vacant.
      this.prisma.room.groupBy({
        by: ['status'],
        where: roomScope,
        _count: { _all: true },
      }),
      // Same idea, plus SUM(total): counts per status AND revenue in one query.
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: invoiceScope,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.contract.count({
        where: { ...contractScope, status: ContractStatus.ACTIVE },
      }),
      this.prisma.invoice.findMany({
        where: { ...invoiceScope, status: InvoiceStatus.ISSUED },
        include: { contract: { include: { tenant: true, room: true } } },
        orderBy: { dueAt: 'asc' },
        take: DUE_INVOICES_LIMIT,
      }),
      this.prisma.contract.findMany({
        where: {
          ...contractScope,
          status: ContractStatus.ACTIVE,
          endsAt: { gt: now },
        },
        include: { tenant: true, room: true },
        orderBy: { endsAt: 'asc' },
        take: EXPIRING_CONTRACTS_LIMIT,
      }),
    ]);

    // A status with zero rows produces no group at all, so every lookup
    // has to fall back to 0 rather than assume the group exists.
    const countRooms = (status: RoomStatus) =>
      roomGroups.find((group) => group.status === status)?._count._all ?? 0;

    const occupiedRooms = countRooms(RoomStatus.OCCUPIED);
    const vacantRooms = countRooms(RoomStatus.VACANT);
    const totalRooms = roomGroups.reduce(
      (sum, group) => sum + group._count._all,
      0,
    );
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const findInvoiceGroup = (status: InvoiceStatus) =>
      invoiceGroups.find((group) => group.status === status);
    const paidGroup = findInvoiceGroup(InvoiceStatus.PAID);

    return {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyRate,
      // Revenue is every PAID invoice ever, not the current month — same
      // semantics the web client used before this endpoint existed.
      // `_sum.total` is null when the group has no rows.
      totalRevenue: paidGroup?._sum.total ?? 0,
      pendingInvoices: findInvoiceGroup(InvoiceStatus.ISSUED)?._count._all ?? 0,
      paidInvoices: paidGroup?._count._all ?? 0,
      activeContracts,
      dueInvoices: dueInvoices.map((invoice) =>
        mapInvoiceResponse(invoice as unknown as InvoiceResponseSource),
      ),
      expiringContracts: expiringContracts.map((contract) =>
        mapContractResponse(contract as unknown as ContractResponseSource),
      ),
    };
  }
}
