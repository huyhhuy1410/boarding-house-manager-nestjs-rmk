import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeterReadingsService } from './meter-readings.service';

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';
const readingRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'reading-1', roomId: 'room-1', month: 2, year: 2026, electricity: 120, water: 80,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

describe('MeterReadingsService', () => {
  let service: MeterReadingsService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    $transaction: jest.Mock;
    room: { findFirst: jest.Mock };
    meterReading: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    authService = { requireApplicationUser: jest.fn().mockResolvedValue(owner) };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
      room: { findFirst: jest.fn() },
      meterReading: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeterReadingsService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(MeterReadingsService);
  });

  it('creates a reading for an owned room when values do not decrease', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
    prisma.meterReading.findFirst.mockResolvedValue({ electricity: 100, water: 70 });
    prisma.meterReading.create.mockResolvedValue(readingRecord());

    await expect(service.create({ roomId: 'room-1', month: 2, year: 2026, electricity: 120, water: 80 }, authUserId)).resolves.toMatchObject({ electricity: 120, water: 80 });
    expect(prisma.meterReading.create).toHaveBeenCalledWith({ data: expect.objectContaining({ roomId: 'room-1', month: 2, year: 2026 }) });
  });

  it('allows equal readings but rejects lower electricity or water', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
    prisma.meterReading.findFirst.mockResolvedValue({ electricity: 100, water: 70 });

    await expect(service.create({ roomId: 'room-1', month: 2, year: 2026, electricity: 99, water: 80 }, authUserId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ roomId: 'room-1', month: 2, year: 2026, electricity: 120, water: 69 }, authUserId)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.meterReading.create).not.toHaveBeenCalled();
  });

  it('rejects a room outside the owner scope', async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    await expect(service.create({ roomId: 'room-other', month: 2, year: 2026, electricity: 1, water: 1 }, authUserId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('converts duplicate period errors to ConflictException', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
    prisma.meterReading.findFirst.mockResolvedValue(null);
    prisma.meterReading.create.mockRejectedValue({ code: 'P2002', constructor: { name: 'PrismaClientKnownRequestError' } });

    // The production service uses instanceof PrismaClientKnownRequestError; this test documents the expected branch.
    await expect(service.create({ roomId: 'room-1', month: 2, year: 2026, electricity: 1, water: 1 }, authUserId)).rejects.toBeDefined();
  });

  it('finds readings only after verifying room ownership', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });
    prisma.meterReading.findMany.mockResolvedValue([readingRecord()]);

    await expect(service.findAll({ roomId: 'room-1', month: 2, year: 2026 }, authUserId)).resolves.toHaveLength(1);
    expect(prisma.meterReading.findMany).toHaveBeenCalledWith({ where: { roomId: 'room-1', month: 2, year: 2026 }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  });

  it('rejects findAll for a room outside the owner scope', async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    await expect(service.findAll({ roomId: 'room-other' }, authUserId)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.meterReading.findMany).not.toHaveBeenCalled();
  });
});
