import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContractStatus, RoomStatus } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from './contracts.service';

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
    code: 'P2002',
    clientVersion: 'test',
  });

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';
const contractRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'contract-1',
  roomId: 'room-1',
  tenantId: 'tenant-1',
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: null,
  deposit: 3000000,
  status: ContractStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ContractsService', () => {
  let service: ContractsService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    $transaction: jest.Mock;
    room: { findFirst: jest.Mock; update: jest.Mock };
    tenant: { findFirst: jest.Mock };
    contract: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    authService = {
      requireApplicationUser: jest.fn().mockResolvedValue(owner),
    };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
      room: { findFirst: jest.fn(), update: jest.fn() },
      tenant: { findFirst: jest.fn() },
      contract: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ContractsService);
  });

  describe('create', () => {
    const dto = {
      roomId: 'room-1',
      tenantId: 'tenant-1',
      startsAt: '2026-01-01T00:00:00.000Z',
      deposit: 3000000,
    };

    it('creates an active contract and marks the room occupied', async () => {
      prisma.room.findFirst.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.VACANT,
      });
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1' });
      prisma.contract.findFirst.mockResolvedValue(null);
      prisma.contract.create.mockResolvedValue(contractRecord());

      await expect(service.create(dto, authUserId)).resolves.toMatchObject({
        status: ContractStatus.ACTIVE,
      });
      expect(prisma.contract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deposit: 3000000,
          status: ContractStatus.ACTIVE,
        }),
      });
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: RoomStatus.OCCUPIED },
      });
    });

    it('rejects a room outside the owner scope', async () => {
      prisma.room.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.contract.create).not.toHaveBeenCalled();
    });

    it('rejects a tenant outside the owner scope', async () => {
      prisma.room.findFirst.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.VACANT,
      });
      prisma.tenant.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.contract.create).not.toHaveBeenCalled();
    });

    it('rejects an occupied room', async () => {
      prisma.room.findFirst.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.OCCUPIED,
      });
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1' });
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.contract.create).not.toHaveBeenCalled();
    });

    it('rejects a second active contract', async () => {
      prisma.room.findFirst.mockResolvedValue({
        id: 'room-1',
        status: RoomStatus.VACANT,
      });
      prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1' });
      prisma.contract.findFirst.mockResolvedValue({ id: 'existing-contract' });
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.room.update).not.toHaveBeenCalled();
    });

    it('maps a P2002 unique violation to a ConflictException on create', async () => {
      prisma.$transaction.mockRejectedValue(p2002());
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows an unknown error from create', async () => {
      prisma.$transaction.mockRejectedValue(new Error('boom'));
      await expect(service.create(dto, authUserId)).rejects.toThrow('boom');
    });
  });

  describe('endContract', () => {
    it('ends an active contract and marks its room vacant', async () => {
      prisma.contract.findFirst.mockResolvedValue({
        id: 'contract-1',
        status: ContractStatus.ACTIVE,
        roomId: 'room-1',
      });
      prisma.contract.update.mockResolvedValue(
        contractRecord({ status: ContractStatus.ENDED, endsAt: new Date() }),
      );

      await expect(
        service.endContract('contract-1', authUserId),
      ).resolves.toMatchObject({ status: ContractStatus.ENDED });
      expect(prisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: expect.objectContaining({ status: ContractStatus.ENDED }),
      });
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: RoomStatus.VACANT },
      });
    });

    it('rejects an unknown or foreign contract', async () => {
      prisma.contract.findFirst.mockResolvedValue(null);
      await expect(
        service.endContract('contract-other', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.contract.update).not.toHaveBeenCalled();
    });

    it('rejects an already ended contract', async () => {
      prisma.contract.findFirst.mockResolvedValue({
        id: 'contract-1',
        status: ContractStatus.ENDED,
        roomId: 'room-1',
      });
      await expect(
        service.endContract('contract-1', authUserId),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.room.update).not.toHaveBeenCalled();
    });
  });

  it('gets only contracts in the owner scope', async () => {
    prisma.contract.findMany.mockResolvedValue([contractRecord()]);
    await expect(
      service.getContracts(authUserId, ContractStatus.ACTIVE),
    ).resolves.toHaveLength(1);
    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ContractStatus.ACTIVE }),
      }),
    );
  });

  it('gets contracts without a status filter', async () => {
    prisma.contract.findMany.mockResolvedValue([contractRecord()]);
    await expect(service.getContracts(authUserId)).resolves.toHaveLength(1);
    const [callArg] = prisma.contract.findMany.mock.calls[0];
    expect(callArg.where).not.toHaveProperty('status');
  });

  it('gets a single contract in the owner scope', async () => {
    prisma.contract.findFirst.mockResolvedValue(contractRecord());
    await expect(
      service.getContract('contract-1', authUserId),
    ).resolves.toMatchObject({ id: 'contract-1' });
  });

  it('rejects a single contract outside the owner scope', async () => {
    prisma.contract.findFirst.mockResolvedValue(null);
    await expect(
      service.getContract('contract-other', authUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
