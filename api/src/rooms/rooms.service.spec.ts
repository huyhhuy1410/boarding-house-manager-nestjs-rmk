import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { RoomsService } from './rooms.service';

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
    code: 'P2002',
    clientVersion: 'test',
  });

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';
const room = (overrides: Record<string, unknown> = {}) => ({
  id: 'room-1',
  code: '101',
  rentAmount: 3000000,
  houseId: 'house-1',
  status: 'VACANT',
  createdAt: new Date(),
  updatedAt: new Date(),
  contracts: [],
  ...overrides,
});

describe('RoomsService', () => {
  let service: RoomsService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    boardingHouse: { findFirst: jest.Mock };
    room: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    authService = {
      requireApplicationUser: jest.fn().mockResolvedValue(owner),
    };
    prisma = {
      boardingHouse: { findFirst: jest.fn() },
      room: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(RoomsService);
  });

  it('creates a room only under an owned house', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
    prisma.room.create.mockResolvedValue(room());
    await expect(
      service.create(
        { houseId: 'house-1', code: '101', rentAmount: 3000000 },
        authUserId,
      ),
    ).resolves.toMatchObject({ id: 'room-1' });
    expect(prisma.room.create).toHaveBeenCalledWith({
      data: { houseId: 'house-1', code: '101', rentAmount: 3000000 },
    });
  });

  it('rejects creating a room in another owner house', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        { houseId: 'house-other', code: '101', rentAmount: 3000000 },
        authUserId,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.room.create).not.toHaveBeenCalled();
  });

  it('maps a P2002 unique violation to a ConflictException on create', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
    prisma.room.create.mockRejectedValue(p2002());
    await expect(
      service.create(
        { houseId: 'house-1', code: '101', rentAmount: 3000000 },
        authUserId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows an unknown error from create', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
    prisma.room.create.mockRejectedValue(new Error('boom'));
    await expect(
      service.create(
        { houseId: 'house-1', code: '101', rentAmount: 3000000 },
        authUserId,
      ),
    ).rejects.toThrow('boom');
  });

  it('lists rooms within the owner scope', async () => {
    prisma.room.findMany.mockResolvedValue([room()]);
    await expect(service.findAll(authUserId)).resolves.toHaveLength(1);
    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { house: { ownerId: owner.id } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('rejects an update with no fields', async () => {
    await expect(
      service.update('room-1', {}, authUserId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.room.findFirst).not.toHaveBeenCalled();
  });

  it('updates supplied room fields', async () => {
    prisma.room.findFirst.mockResolvedValue(room());
    prisma.room.update.mockResolvedValue(room({ rentAmount: 3500000 }));
    await expect(
      service.update('room-1', { rentAmount: 3500000 }, authUserId),
    ).resolves.toMatchObject({ rentAmount: 3500000 });
    expect(prisma.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { code: undefined, rentAmount: 3500000 },
    });
  });

  it('does not update a room in another owner house', async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    await expect(
      service.update('room-1', { rentAmount: 3500000 }, authUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.room.update).not.toHaveBeenCalled();
  });

  it('maps a P2002 unique violation to a ConflictException on update', async () => {
    prisma.room.findFirst.mockResolvedValue(room());
    prisma.room.update.mockRejectedValue(p2002());
    await expect(
      service.update('room-1', { code: '999' }, authUserId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows an unknown error from update', async () => {
    prisma.room.findFirst.mockResolvedValue(room());
    prisma.room.update.mockRejectedValue(new Error('boom'));
    await expect(
      service.update('room-1', { code: '999' }, authUserId),
    ).rejects.toThrow('boom');
  });

  it('does not delete a room with an active contract', async () => {
    prisma.room.findFirst.mockResolvedValue(
      room({ contracts: [{ id: 'contract-1' }] }),
    );
    await expect(service.remove('room-1', authUserId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.room.delete).not.toHaveBeenCalled();
  });

  it('deletes an owned vacant room', async () => {
    prisma.room.findFirst.mockResolvedValue(room());
    prisma.room.delete.mockResolvedValue(room());
    await expect(service.remove('room-1', authUserId)).resolves.toMatchObject({
      id: 'room-1',
    });
  });

  it('does not delete a room that does not exist in the owner scope', async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    await expect(service.remove('room-1', authUserId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.room.delete).not.toHaveBeenCalled();
  });

  it('finds one owned room', async () => {
    prisma.room.findFirst.mockResolvedValue(room());
    await expect(service.findOne('room-1', authUserId)).resolves.toMatchObject({
      id: 'room-1',
    });
  });

  it('does not find a room outside the owner scope', async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    await expect(service.findOne('room-1', authUserId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
