import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: { getStats: jest.Mock };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const stats = {
    totalRooms: 4,
    occupiedRooms: 3,
    vacantRooms: 1,
    occupancyRate: 75,
    totalRevenue: 5_000_000,
    pendingInvoices: 1,
    paidInvoices: 2,
    activeContracts: 3,
    dueInvoices: [],
    expiringContracts: [],
  };

  beforeEach(async () => {
    service = { getStats: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getStats delegates the authenticated user id to the service', async () => {
    service.getStats.mockResolvedValue(stats);

    await expect(controller.getStats(user)).resolves.toEqual(stats);
    expect(service.getStats).toHaveBeenCalledWith(user.id);
  });

  it('propagates service exceptions', async () => {
    service.getStats.mockRejectedValue(new ForbiddenException());

    await expect(controller.getStats(user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
