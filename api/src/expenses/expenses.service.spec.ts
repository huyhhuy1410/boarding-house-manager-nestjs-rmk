import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExpenseCategory } from '../generated/prisma/enums';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';

const expenseRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'expense-1',
  boardingHouseId: 'house-1',
  maintenanceRequestId: null,
  category: ExpenseCategory.UTILITIES,
  title: 'Electricity bill',
  description: null,
  amount: 350000,
  spentAt: new Date('2026-01-10T00:00:00.000Z'),
  createdAt: new Date('2026-01-10T00:00:00.000Z'),
  updatedAt: new Date('2026-01-10T00:00:00.000Z'),
  boardingHouse: { id: 'house-1', name: 'An Tam' },
  maintenanceRequest: null,
  ...overrides,
});

describe('ExpensesService', () => {
  let service: ExpensesService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    $transaction: jest.Mock;
    expense: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    boardingHouse: { findFirst: jest.Mock };
    maintenanceRequest: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    authService = { requireApplicationUser: jest.fn().mockResolvedValue(owner) };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
      expense: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      boardingHouse: { findFirst: jest.fn() },
      maintenanceRequest: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ExpensesService);
  });

  describe('create', () => {
    const dto = {
      boardingHouseId: 'house-1',
      category: ExpenseCategory.UTILITIES,
      title: 'Electricity bill',
      amount: 350000,
      spentAt: '2026-01-10T00:00:00.000Z',
    };

    it('creates an expense for an owned boarding house', async () => {
      prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.expense.create.mockResolvedValue(expenseRecord());

      await expect(service.create(dto, authUserId)).resolves.toMatchObject({
        id: 'expense-1',
        boardingHouseId: 'house-1',
        amount: 350000,
      });
      expect(prisma.boardingHouse.findFirst).toHaveBeenCalledWith({
        where: { id: 'house-1', ownerId: owner.id },
        select: { id: true },
      });
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boardingHouseId: 'house-1',
          amount: 350000,
          spentAt: new Date('2026-01-10T00:00:00.000Z'),
        }),
      });
    });

    it('rejects a boarding house owned by another user', async () => {
      prisma.boardingHouse.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('creates an expense without a maintenance request', async () => {
      prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.expense.create.mockResolvedValue(expenseRecord());

      await service.create(dto, authUserId);

      expect(prisma.maintenanceRequest.findFirst).not.toHaveBeenCalled();
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ maintenanceRequestId: expect.anything() }),
      });
    });

    it('requires the maintenance request to belong to the selected house', async () => {
      prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.maintenanceRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { ...dto, maintenanceRequestId: 'request-1' },
          authUserId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('links a valid maintenance request', async () => {
      prisma.boardingHouse.findFirst.mockResolvedValue({ id: 'house-1' });
      prisma.maintenanceRequest.findFirst.mockResolvedValue({ id: 'request-1' });
      prisma.expense.create.mockResolvedValue(
        expenseRecord({ maintenanceRequestId: 'request-1' }),
      );

      await service.create(
        { ...dto, maintenanceRequestId: 'request-1' },
        authUserId,
      );

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ maintenanceRequestId: 'request-1' }),
      });
    });
  });

  describe('findAll', () => {
    it('returns only expenses under the current owner and orders newest first', async () => {
      prisma.expense.findMany.mockResolvedValue([expenseRecord()]);

      await expect(service.findAll(authUserId)).resolves.toHaveLength(1);
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { boardingHouse: { ownerId: owner.id } },
        include: { maintenanceRequest: true, boardingHouse: true },
        orderBy: { spentAt: 'desc' },
      });
    });

    it('returns an empty list when the owner has no expenses', async () => {
      prisma.expense.findMany.mockResolvedValue([]);

      await expect(service.findAll(authUserId)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns an owned expense with related data', async () => {
      prisma.expense.findFirst.mockResolvedValue(expenseRecord());

      await expect(service.findOne('expense-1', authUserId)).resolves.toMatchObject({
        id: 'expense-1',
        boardingHouse: { name: 'An Tam' },
      });
      expect(prisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 'expense-1', boardingHouse: { ownerId: owner.id } },
        include: { maintenanceRequest: true, boardingHouse: true },
      });
    });

    it('does not reveal an expense from another owner', async () => {
      prisma.expense.findFirst.mockResolvedValue(null);

      await expect(service.findOne('expense-other', authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
