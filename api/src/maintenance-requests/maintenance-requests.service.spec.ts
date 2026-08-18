import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MaintenanceRequestChargeTo,
  MaintenanceRequestStatus,
} from '../generated/prisma/enums';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceRequestsService } from './maintenance-requests.service';

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';

const requestRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'request-1',
  roomId: 'room-1',
  tenantId: 'tenant-1',
  status: MaintenanceRequestStatus.OPEN,
  chargeTo: null,
  title: 'Leaking faucet',
  description: 'The faucet leaks.',
  estimatedCost: null,
  actualCost: null,
  resolvedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('MaintenanceRequestsService', () => {
  let service: MaintenanceRequestsService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    $transaction: jest.Mock;
    room: { findFirst: jest.Mock };
    tenant: { findFirst: jest.Mock };
    maintenanceRequest: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    expense: { create: jest.Mock };
  };

  beforeEach(async () => {
    authService = {
      requireApplicationUser: jest.fn().mockResolvedValue(owner),
    };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
      room: { findFirst: jest.fn() },
      tenant: { findFirst: jest.fn() },
      maintenanceRequest: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      expense: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceRequestsService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MaintenanceRequestsService);
  });

  describe('create', () => {
    const dto = {
      roomId: 'room-1',
      tenantId: 'tenant-1',
      title: 'Leaking faucet',
      description: 'The faucet leaks.',
    };

    it('creates a request for an owned room and active tenant', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1' });
      prisma.maintenanceRequest.create.mockResolvedValue(requestRecord());

      await expect(service.create(dto, authUserId)).resolves.toMatchObject({
        id: 'request-1',
        roomId: 'room-1',
        tenantId: 'tenant-1',
        status: MaintenanceRequestStatus.OPEN,
      });
      expect(authService.requireApplicationUser).toHaveBeenCalledWith(
        authUserId,
      );
      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'tenant-1',
            ownerId: owner.id,
            contracts: { some: { roomId: 'room-1', status: 'ACTIVE' } },
          }),
        }),
      );
    });

    it('allows a request without a tenant', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
      prisma.maintenanceRequest.create.mockResolvedValue(
        requestRecord({ tenantId: null }),
      );

      await expect(
        service.create({ ...dto, tenantId: undefined }, authUserId),
      ).resolves.toMatchObject({ tenantId: null });
      expect(prisma.tenant.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a room that is not owned by the user', async () => {
      prisma.room.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.maintenanceRequest.create).not.toHaveBeenCalled();
    });

    it('rejects a tenant without an active contract for the room', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.maintenanceRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns owner-scoped requests newest first', async () => {
      prisma.maintenanceRequest.findMany.mockResolvedValue([
        requestRecord({ id: 'request-2' }),
        requestRecord({ id: 'request-1' }),
      ]);

      await expect(service.findAll(authUserId)).resolves.toMatchObject([
        { id: 'request-2' },
        { id: 'request-1' },
      ]);
      expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { room: { house: { ownerId: owner.id } } },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('returns an empty list when the owner has no requests', async () => {
      prisma.maintenanceRequest.findMany.mockResolvedValue([]);

      await expect(service.findAll(authUserId)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns a request inside the owner scope', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(requestRecord());

      await expect(
        service.findOne('request-1', authUserId),
      ).resolves.toMatchObject({ id: 'request-1', roomId: 'room-1' });
      expect(prisma.maintenanceRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'request-1',
            room: { house: { ownerId: owner.id } },
          },
        }),
      );
    });

    it('rejects a request outside the owner scope', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('request-other', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('start', () => {
    it('moves an owned OPEN request to IN_PROGRESS', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
        requestRecord({ status: MaintenanceRequestStatus.IN_PROGRESS }),
      );

      await expect(
        service.start('request-1', authUserId),
      ).resolves.toMatchObject({
        status: MaintenanceRequestStatus.IN_PROGRESS,
      });
      // Guard nằm trong where của updateMany -> atomic, không phải read-then-write.
      expect(prisma.maintenanceRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'request-1',
          status: MaintenanceRequestStatus.OPEN,
          room: { house: { ownerId: owner.id } },
        },
        data: { status: MaintenanceRequestStatus.IN_PROGRESS },
      });
    });

    it.each([
      MaintenanceRequestStatus.IN_PROGRESS,
      MaintenanceRequestStatus.RESOLVED,
      MaintenanceRequestStatus.CANCELLED,
    ])('rejects a request already in %s with a conflict', async (status) => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.maintenanceRequest.findFirst.mockResolvedValue({ status });

      await expect(
        service.start('request-1', authUserId),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        prisma.maintenanceRequest.findUniqueOrThrow,
      ).not.toHaveBeenCalled();
    });

    it('rejects a request outside the owner scope with a 404', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.start('request-1', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resolve', () => {
    const resolveDto = {
      chargeTo: MaintenanceRequestChargeTo.OWNER,
      estimatedCost: 200000,
      actualCost: 150000,
    };

    const resolvedRecord = (overrides: Record<string, unknown> = {}) =>
      requestRecord({
        status: MaintenanceRequestStatus.RESOLVED,
        resolvedAt: new Date('2026-02-01T00:00:00.000Z'),
        room: { houseId: 'house-1' },
        ...overrides,
      });

    it('resolves an IN_PROGRESS request and creates an owner expense', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
        resolvedRecord({
          chargeTo: MaintenanceRequestChargeTo.OWNER,
          estimatedCost: 200000,
          actualCost: 150000,
        }),
      );
      prisma.expense.create.mockResolvedValue({});

      await expect(
        service.resolve('request-1', resolveDto, authUserId),
      ).resolves.toMatchObject({
        status: MaintenanceRequestStatus.RESOLVED,
        actualCost: 150000,
      });
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            boardingHouseId: 'house-1',
            maintenanceRequestId: 'request-1',
            amount: 150000,
            title: 'Sửa chữa: Leaking faucet',
            description: 'Chi phí sửa chữa do chủ nhà chi trả',
          }),
        }),
      );
    });

    it('gates the transition on IN_PROGRESS inside the updateMany where clause', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
        resolvedRecord(),
      );

      await service.resolve('request-1', resolveDto, authUserId);

      expect(prisma.maintenanceRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'request-1',
            status: MaintenanceRequestStatus.IN_PROGRESS,
            room: { house: { ownerId: owner.id } },
          },
        }),
      );
      // Toàn bộ resolve nằm trong đúng một transaction.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    // A2: request thứ hai trong cuộc đua thấy count === 0 -> không tạo Expense trùng.
    it('rejects a concurrent second resolve and creates no duplicate expense', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.maintenanceRequest.findFirst.mockResolvedValue({
        status: MaintenanceRequestStatus.RESOLVED,
      });

      await expect(
        service.resolve('request-1', resolveDto, authUserId),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
      expect(
        prisma.maintenanceRequest.findUniqueOrThrow,
      ).not.toHaveBeenCalled();
    });

    it('rejects resolving a request outside the owner scope with a 404', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.resolve('request-1', resolveDto, authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    // A3: phí do khách thuê chịu được trả trực tiếp ngoài hệ thống,
    // không có Expense nào được sinh ra. Nhưng muốn chọn TENANT thì
    // yêu cầu PHẢI có tenant — "khách thuê chịu phí" mà không có khách là vô nghĩa.
    it('resolves with chargeTo TENANT when the request has a tenant', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
        resolvedRecord({
          tenantId: 'tenant-1',
          chargeTo: MaintenanceRequestChargeTo.TENANT,
          actualCost: 150000,
        }),
      );

      await expect(
        service.resolve(
          'request-1',
          { ...resolveDto, chargeTo: MaintenanceRequestChargeTo.TENANT },
          authUserId,
        ),
      ).resolves.toMatchObject({
        status: MaintenanceRequestStatus.RESOLVED,
        chargeTo: MaintenanceRequestChargeTo.TENANT,
        tenantId: 'tenant-1',
      });
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    // A2 (mở rộng): chọn TENANT trên request không có tenant -> Conflict.
    it('rejects chargeTo TENANT when the request has no tenant', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
        resolvedRecord({
          tenantId: null,
          chargeTo: MaintenanceRequestChargeTo.TENANT,
          actualCost: 150000,
        }),
      );

      await expect(
        service.resolve(
          'request-1',
          { ...resolveDto, chargeTo: MaintenanceRequestChargeTo.TENANT },
          authUserId,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it.each([
      { chargeTo: MaintenanceRequestChargeTo.TENANT, actualCost: 150000 },
      { chargeTo: MaintenanceRequestChargeTo.OWNER, actualCost: 0 },
      { chargeTo: MaintenanceRequestChargeTo.OWNER, actualCost: undefined },
    ])(
      'does not create an expense for $chargeTo with actualCost=$actualCost',
      async (dto) => {
        prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
        prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
          resolvedRecord(),
        );
        prisma.expense.create.mockReset();

        await service.resolve('request-1', dto, authUserId);
        expect(prisma.expense.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('cancel', () => {
    it('cancels an owned OPEN or IN_PROGRESS request', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(
        requestRecord({ status: MaintenanceRequestStatus.CANCELLED }),
      );

      await expect(
        service.cancel('request-1', authUserId),
      ).resolves.toMatchObject({
        status: MaintenanceRequestStatus.CANCELLED,
      });
      // Cả hai status "còn sống" đều nằm trong guard, nên chỉ cần 1 test cho where.
      expect(prisma.maintenanceRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'request-1',
          status: {
            in: [
              MaintenanceRequestStatus.OPEN,
              MaintenanceRequestStatus.IN_PROGRESS,
            ],
          },
          room: { house: { ownerId: owner.id } },
        },
        data: { status: MaintenanceRequestStatus.CANCELLED },
      });
    });

    it('rejects cancelling a terminal request with a conflict', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.maintenanceRequest.findFirst.mockResolvedValue({
        status: MaintenanceRequestStatus.RESOLVED,
      });

      await expect(
        service.cancel('request-1', authUserId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects cancelling a request outside the owner scope with a 404', async () => {
      prisma.maintenanceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.cancel('request-1', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes an OPEN request without actual cost', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(requestRecord());
      prisma.maintenanceRequest.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.remove('request-1', authUserId),
      ).resolves.toMatchObject({ id: 'request-1' });
      expect(prisma.maintenanceRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'request-1',
          status: {
            in: [
              MaintenanceRequestStatus.OPEN,
              MaintenanceRequestStatus.IN_PROGRESS,
            ],
          },
          actualCost: null,
          room: { house: { ownerId: owner.id } },
        },
      });
    });

    it('rejects deleting a request that is not owned', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('request-1', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.maintenanceRequest.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects deleting a request with actual cost or terminal status', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(
        requestRecord({
          status: MaintenanceRequestStatus.RESOLVED,
          actualCost: 150000,
        }),
      );
      prisma.maintenanceRequest.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.remove('request-1', authUserId),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
