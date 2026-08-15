import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ExpenseCategory } from '../generated/prisma/enums';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const expense = {
    id: 'expense-1',
    boardingHouseId: 'house-1',
    category: ExpenseCategory.MAINTENANCE,
    title: 'Replace faucet',
    amount: 150000,
  };
  const createDto: CreateExpenseDto = {
    boardingHouseId: 'house-1',
    category: ExpenseCategory.MAINTENANCE,
    title: 'Replace faucet',
    amount: 150000,
    spentAt: '2026-07-31T00:00:00.000Z',
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(ExpensesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(expense);

    await expect(controller.create(createDto, user)).resolves.toEqual(expense);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('findAll delegates the authenticated user id to the service', async () => {
    service.findAll.mockResolvedValue([expense]);

    await expect(controller.findAll(user)).resolves.toEqual([expense]);
    expect(service.findAll).toHaveBeenCalledWith(user.id);
  });

  it('findOne delegates expense id and user id to the service', async () => {
    service.findOne.mockResolvedValue(expense);

    await expect(controller.findOne('expense-1', user)).resolves.toEqual(expense);
    expect(service.findOne).toHaveBeenCalledWith('expense-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Expense not found.'));

    await expect(controller.findOne('missing', user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
