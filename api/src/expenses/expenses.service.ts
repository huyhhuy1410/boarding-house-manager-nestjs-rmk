import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExpenseResponseSource,
  mapExpenseResponse,
} from './dto/expense-response.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}
  /**
   * An expense is owner-side cost. It can optionally point at the maintenance
   * request that caused it, but only a request inside the same house as the
   * expense — otherwise a cross-house link would let one owner read another's
   * maintenance data through this response.
   *
   * Note: a request resolved with `chargeTo: OWNER` already created an
   * expense automatically, so attaching another one here is possible today.
   * A unique constraint on `maintenanceRequestId` would close that.
   */
  async create(dto: CreateExpenseDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);
    return this.prisma.$transaction(async (tx) => {
      const boardingHouse = await tx.boardingHouse.findFirst({
        where: {
          id: dto.boardingHouseId,
          ownerId: owner.id,
        },
        select: {
          id: true,
        },
      });

      if (!boardingHouse) {
        throw new NotFoundException('Boarding house not found.');
      }

      let maintenanceRequestId: string | undefined;

      if (dto.maintenanceRequestId) {
        const maintenanceRequest = await tx.maintenanceRequest.findFirst({
          where: {
            id: dto.maintenanceRequestId,
            room: {
              houseId: boardingHouse.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (!maintenanceRequest) {
          throw new NotFoundException('Maintenance request not found.');
        }

        maintenanceRequestId = maintenanceRequest.id;
      }

      const expense = await tx.expense.create({
        data: {
          boardingHouseId: boardingHouse.id,
          maintenanceRequestId,
          category: dto.category,
          title: dto.title,
          description: dto.description,
          amount: dto.amount,
          // The date the money was actually spent is client-supplied on
          // purpose: a landlord back-fills last month's bill today, and the
          // server clock would file it under the wrong month.
          spentAt: new Date(dto.spentAt),
        },
      });

      return mapExpenseResponse(expense);
    });
  }

  async findAll(authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const expenses = await this.prisma.expense.findMany({
      where: {
        boardingHouse: {
          ownerId: owner.id,
        },
      },
      include: {
        maintenanceRequest: true,
        boardingHouse: true,
      },
      orderBy: {
        spentAt: 'desc',
      },
    });

    return expenses.map((expense) =>
      mapExpenseResponse(expense as ExpenseResponseSource),
    );
  }

  async findOne(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        boardingHouse: {
          ownerId: owner.id,
        },
      },
      include: {
        maintenanceRequest: true,
        boardingHouse: true,
      },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }

    return mapExpenseResponse(expense);
  }
}
