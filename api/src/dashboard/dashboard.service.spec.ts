import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContractStatus,
  InvoiceStatus,
  RoomStatus,
} from '../generated/prisma/enums';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';

const ownerScopedContract = {
  tenant: { ownerId: owner.id },
  room: { house: { ownerId: owner.id } },
};

const invoiceRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'invoice-1',
  contractId: 'contract-1',
  month: 7,
  year: 2026,
  status: InvoiceStatus.ISSUED,
  rentAmount: 3_000_000,
  electricityUsage: 50,
  electricityUnitPrice: 3_500,
  waterUsage: 4,
  waterUnitPrice: 30_000,
  total: 3_295_000,
  issuedAt: new Date('2026-08-01T00:00:00.000Z'),
  dueAt: new Date('2026-08-08T00:00:00.000Z'),
  paidAt: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  contract: {
    id: 'contract-1',
    tenant: { id: 'tenant-1', name: 'Nguyen Van A', phone: '0900000001' },
    room: { id: 'room-1', code: 'P101' },
  },
  ...overrides,
});

const contractRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'contract-1',
  roomId: 'room-1',
  tenantId: 'tenant-1',
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: new Date('2026-09-01T00:00:00.000Z'),
  deposit: 3_000_000,
  status: ContractStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  tenant: { id: 'tenant-1', name: 'Nguyen Van A', phone: '0900000001' },
  room: { id: 'room-1', code: 'P101' },
  ...overrides,
});

describe('DashboardService', () => {
  let service: DashboardService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    room: { groupBy: jest.Mock };
    invoice: { groupBy: jest.Mock; findMany: jest.Mock };
    contract: { count: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    authService = {
      requireApplicationUser: jest.fn().mockResolvedValue(owner),
    };
    prisma = {
      room: {
        groupBy: jest.fn().mockResolvedValue([
          { status: RoomStatus.OCCUPIED, _count: { _all: 3 } },
          { status: RoomStatus.VACANT, _count: { _all: 1 } },
        ]),
      },
      invoice: {
        groupBy: jest.fn().mockResolvedValue([
          {
            status: InvoiceStatus.PAID,
            _count: { _all: 2 },
            _sum: { total: 5_000_000 },
          },
          {
            status: InvoiceStatus.ISSUED,
            _count: { _all: 1 },
            _sum: { total: 3_295_000 },
          },
          {
            status: InvoiceStatus.DRAFT,
            _count: { _all: 4 },
            _sum: { total: 8_000_000 },
          },
        ]),
        findMany: jest.fn().mockResolvedValue([invoiceRecord()]),
      },
      contract: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([contractRecord()]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  describe('room stats', () => {
    it('derives totals and occupancy rate from the status groups', async () => {
      await expect(service.getStats(authUserId)).resolves.toMatchObject({
        totalRooms: 4,
        occupiedRooms: 3,
        vacantRooms: 1,
        occupancyRate: 75,
      });
    });

    it('returns zeroed room stats when the owner has no rooms', async () => {
      prisma.room.groupBy.mockResolvedValue([]);

      await expect(service.getStats(authUserId)).resolves.toMatchObject({
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        // Guards the division by zero rather than returning NaN.
        occupancyRate: 0,
      });
    });

    it('defaults a missing status group to zero', async () => {
      prisma.room.groupBy.mockResolvedValue([
        { status: RoomStatus.OCCUPIED, _count: { _all: 2 } },
      ]);

      await expect(service.getStats(authUserId)).resolves.toMatchObject({
        totalRooms: 2,
        occupiedRooms: 2,
        vacantRooms: 0,
        occupancyRate: 100,
      });
    });

    it('rounds the occupancy rate to a whole percent', async () => {
      prisma.room.groupBy.mockResolvedValue([
        { status: RoomStatus.OCCUPIED, _count: { _all: 1 } },
        { status: RoomStatus.VACANT, _count: { _all: 2 } },
      ]);

      const stats = await service.getStats(authUserId);

      expect(stats.occupancyRate).toBe(33);
    });
  });

  describe('invoice stats', () => {
    it('sums revenue from PAID invoices only and counts ISSUED as pending', async () => {
      await expect(service.getStats(authUserId)).resolves.toMatchObject({
        totalRevenue: 5_000_000,
        paidInvoices: 2,
        pendingInvoices: 1,
      });
    });

    it('ignores DRAFT and VOID invoices when summing revenue', async () => {
      prisma.invoice.groupBy.mockResolvedValue([
        {
          status: InvoiceStatus.DRAFT,
          _count: { _all: 4 },
          _sum: { total: 8_000_000 },
        },
        {
          status: InvoiceStatus.VOID,
          _count: { _all: 2 },
          _sum: { total: 1_000_000 },
        },
      ]);

      await expect(service.getStats(authUserId)).resolves.toMatchObject({
        totalRevenue: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
      });
    });

    it('treats a null _sum as zero revenue', async () => {
      // Prisma returns _sum: { total: null } for a group with no rows.
      prisma.invoice.groupBy.mockResolvedValue([
        {
          status: InvoiceStatus.PAID,
          _count: { _all: 0 },
          _sum: { total: null },
        },
      ]);

      const stats = await service.getStats(authUserId);

      expect(stats.totalRevenue).toBe(0);
    });
  });

  describe('lists', () => {
    it('maps due invoices through the invoice response mapper', async () => {
      const stats = await service.getStats(authUserId);

      expect(stats.dueInvoices).toHaveLength(1);
      expect(stats.dueInvoices[0]).toMatchObject({
        id: 'invoice-1',
        total: 3_295_000,
        contract: { tenant: { name: 'Nguyen Van A' }, room: { code: 'P101' } },
      });
    });

    it('maps expiring contracts through the contract response mapper', async () => {
      const stats = await service.getStats(authUserId);

      expect(stats.expiringContracts).toHaveLength(1);
      expect(stats.expiringContracts[0]).toMatchObject({
        id: 'contract-1',
        status: ContractStatus.ACTIVE,
        tenant: { name: 'Nguyen Van A' },
      });
    });

    it('returns empty lists when nothing is due or expiring', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.contract.findMany.mockResolvedValue([]);

      await expect(service.getStats(authUserId)).resolves.toMatchObject({
        dueInvoices: [],
        expiringContracts: [],
      });
    });
  });

  describe('ownership scoping', () => {
    it('counts only rooms in houses owned by the current user', async () => {
      await service.getStats(authUserId);

      expect(authService.requireApplicationUser).toHaveBeenCalledWith(
        authUserId,
      );
      expect(prisma.room.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { house: { ownerId: owner.id } },
        _count: { _all: true },
      });
    });

    it('scopes invoice aggregates through the contract relation', async () => {
      await service.getStats(authUserId);

      expect(prisma.invoice.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { contract: ownerScopedContract },
        _count: { _all: true },
        _sum: { total: true },
      });
    });

    it('counts only ACTIVE contracts owned by the current user', async () => {
      await service.getStats(authUserId);

      expect(prisma.contract.count).toHaveBeenCalledWith({
        where: { ...ownerScopedContract, status: ContractStatus.ACTIVE },
      });
    });

    it('takes the 5 nearest-due ISSUED invoices', async () => {
      await service.getStats(authUserId);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          contract: ownerScopedContract,
          status: InvoiceStatus.ISSUED,
        },
        include: { contract: { include: { tenant: true, room: true } } },
        orderBy: { dueAt: 'asc' },
        take: 5,
      });
    });

    it('takes the 5 soonest-ending ACTIVE contracts that end in the future', async () => {
      await service.getStats(authUserId);

      expect(prisma.contract.findMany).toHaveBeenCalledWith({
        where: {
          ...ownerScopedContract,
          status: ContractStatus.ACTIVE,
          endsAt: { gt: expect.any(Date) },
        },
        include: { tenant: true, room: true },
        orderBy: { endsAt: 'asc' },
        take: 5,
      });
    });

    it('does not query anything when the user is not provisioned', async () => {
      authService.requireApplicationUser.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(service.getStats(authUserId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.room.groupBy).not.toHaveBeenCalled();
      expect(prisma.invoice.groupBy).not.toHaveBeenCalled();
      expect(prisma.contract.count).not.toHaveBeenCalled();
    });
  });
});
