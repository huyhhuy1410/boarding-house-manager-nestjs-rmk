import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceRequestChargeTo, MaintenanceRequestStatus } from '../generated/prisma/enums';
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
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    expense: { create: jest.Mock };
  };

  beforeEach(async () => {
    authService = { requireApplicationUser: jest.fn().mockResolvedValue(owner) };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
      room: { findFirst: jest.fn() },
      tenant: { findFirst: jest.fn() },
      maintenanceRequest: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
      expect(authService.requireApplicationUser).toHaveBeenCalledWith(authUserId);
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

  describe('start', () => {
    it('moves an owned OPEN request to IN_PROGRESS', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue({ id: 'request-1' });
      prisma.maintenanceRequest.update.mockResolvedValue(
        requestRecord({ status: MaintenanceRequestStatus.IN_PROGRESS }),
      );

      await expect(service.start('request-1', authUserId)).resolves.toMatchObject({
        status: MaintenanceRequestStatus.IN_PROGRESS,
      });
      expect(prisma.maintenanceRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'request-1',
            status: MaintenanceRequestStatus.OPEN,
          }),
        }),
      );
    });

    it.each([MaintenanceRequestStatus.IN_PROGRESS, MaintenanceRequestStatus.RESOLVED, MaintenanceRequestStatus.CANCELLED])(
      'rejects a request already in %s', async (status) => {
        prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

        await expect(service.start('request-1', authUserId)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(status).toBeDefined();
      },
    );
  });

  describe('resolve', () => {
    const resolveDto = {
      chargeTo: MaintenanceRequestChargeTo.OWNER,
      estimatedCost: 200000,
      actualCost: 150000,
    };

    it('resolves an IN_PROGRESS request and creates an owner expense', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue({
        id: 'request-1',
        tenantId: 'tenant-1',
        title: 'Leaking faucet',
        room: { houseId: 'house-1' },
      });
      prisma.maintenanceRequest.update.mockResolvedValue(
        requestRecord({
          status: MaintenanceRequestStatus.RESOLVED,
          chargeTo: MaintenanceRequestChargeTo.OWNER,
          estimatedCost: 200000,
          actualCost: 150000,
          resolvedAt: new Date(),
        }),
      );
      prisma.expense.create.mockResolvedValue({});

      await expect(service.resolve('request-1', resolveDto, authUserId)).resolves.toMatchObject({
        status: MaintenanceRequestStatus.RESOLVED,
        actualCost: 150000,
      });
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            boardingHouseId: 'house-1',
            maintenanceRequestId: 'request-1',
            amount: 150000,
          }),
        }),
      );
    });

    it('rejects resolving a request that is not IN_PROGRESS', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.resolve('request-1', resolveDto, authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires a tenant when charging the repair to a tenant', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue({
        id: 'request-1',
        tenantId: null,
        title: 'Leaking faucet',
        room: { houseId: 'house-1' },
      });

      await expect(
        service.resolve(
          'request-1',
          { ...resolveDto, chargeTo: MaintenanceRequestChargeTo.TENANT },
          authUserId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      { chargeTo: MaintenanceRequestChargeTo.TENANT, actualCost: 150000 },
      { chargeTo: MaintenanceRequestChargeTo.OWNER, actualCost: 0 },
      { chargeTo: MaintenanceRequestChargeTo.OWNER, actualCost: undefined },
    ])('does not create an expense for $chargeTo with actualCost=$actualCost', async (dto) => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue({
        id: 'request-1',
        tenantId: 'tenant-1',
        title: 'Leaking faucet',
        room: { houseId: 'house-1' },
      });
      prisma.maintenanceRequest.update.mockResolvedValue(
        requestRecord({ status: MaintenanceRequestStatus.RESOLVED }),
      );
      prisma.expense.create.mockReset();

      await service.resolve('request-1', dto, authUserId);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });
  });

  describe('cancel and remove', () => {
    it.each([MaintenanceRequestStatus.OPEN, MaintenanceRequestStatus.IN_PROGRESS])(
      'cancels an owned %s request', async (status) => {
        prisma.maintenanceRequest.findFirst.mockResolvedValue({ id: 'request-1' });
        prisma.maintenanceRequest.update.mockResolvedValue(
          requestRecord({ status: MaintenanceRequestStatus.CANCELLED }),
        );

        await expect(service.cancel('request-1', authUserId)).resolves.toMatchObject({
          status: MaintenanceRequestStatus.CANCELLED,
        });
        expect(status).toBeDefined();
      },
    );

    it('rejects cancelling a terminal request', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(service.cancel('request-1', authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes an OPEN request without actual cost', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue({ id: 'request-1' });
      prisma.maintenanceRequest.delete.mockResolvedValue(requestRecord());

      await expect(service.remove('request-1', authUserId)).resolves.toMatchObject({
        id: 'request-1',
      });
      expect(prisma.maintenanceRequest.delete).toHaveBeenCalledWith({
        where: { id: 'request-1' },
      });
    });

    it('rejects deleting a request with actual cost or terminal status', async () => {
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(service.remove('request-1', authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.maintenanceRequest.delete).not.toHaveBeenCalled();
    });
  });
});
