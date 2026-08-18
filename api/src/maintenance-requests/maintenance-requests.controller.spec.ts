import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { MaintenanceRequestChargeTo } from '../generated/prisma/enums';
import { MaintenanceRequestsController } from './maintenance-requests.controller';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { ResolveMaintenanceRequestDto } from './dto/resolve-maintenance-request.dto';

describe('MaintenanceRequestsController', () => {
  let controller: MaintenanceRequestsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    start: jest.Mock;
    resolve: jest.Mock;
    cancel: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const request = {
    id: 'request-1',
    roomId: 'room-1',
    title: 'Broken faucet',
    description: 'The faucet is leaking.',
    status: 'OPEN',
  };
  const createDto: CreateMaintenanceRequestDto = {
    roomId: 'room-1',
    title: 'Broken faucet',
    description: 'The faucet is leaking.',
  };
  const resolveDto: ResolveMaintenanceRequestDto = {
    chargeTo: MaintenanceRequestChargeTo.OWNER,
    estimatedCost: 200000,
    actualCost: 150000,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      start: jest.fn(),
      resolve: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceRequestsController],
      providers: [{ provide: MaintenanceRequestsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(MaintenanceRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(request);

    await expect(controller.create(createDto, user)).resolves.toEqual(request);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('findAll delegates the authenticated user id to the service', async () => {
    service.findAll.mockResolvedValue([request]);

    await expect(controller.findAll(user)).resolves.toEqual([request]);
    expect(service.findAll).toHaveBeenCalledWith(user.id);
  });

  it('findOne delegates request id and user id to the service', async () => {
    service.findOne.mockResolvedValue(request);

    await expect(controller.findOne('request-1', user)).resolves.toEqual(
      request,
    );
    expect(service.findOne).toHaveBeenCalledWith('request-1', user.id);
  });

  it('remove delegates request id and user id to the service', async () => {
    service.remove.mockResolvedValue(request);

    await expect(controller.remove('request-1', user)).resolves.toEqual(
      request,
    );
    expect(service.remove).toHaveBeenCalledWith('request-1', user.id);
  });

  it('start delegates request id and user id to the service', async () => {
    service.start.mockResolvedValue({ ...request, status: 'IN_PROGRESS' });

    await expect(controller.start('request-1', user)).resolves.toMatchObject({
      status: 'IN_PROGRESS',
    });
    expect(service.start).toHaveBeenCalledWith('request-1', user.id);
  });

  it('resolve delegates request id, dto and user id to the service', async () => {
    service.resolve.mockResolvedValue({ ...request, status: 'RESOLVED' });

    await expect(
      controller.resolve('request-1', resolveDto, user),
    ).resolves.toMatchObject({ status: 'RESOLVED' });
    expect(service.resolve).toHaveBeenCalledWith(
      'request-1',
      resolveDto,
      user.id,
    );
  });

  it('cancel delegates request id and user id to the service', async () => {
    service.cancel.mockResolvedValue({ ...request, status: 'CANCELLED' });

    await expect(controller.cancel('request-1', user)).resolves.toMatchObject({
      status: 'CANCELLED',
    });
    expect(service.cancel).toHaveBeenCalledWith('request-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.resolve.mockRejectedValue(
      new ConflictException(
        'Only IN_PROGRESS requests can be resolved (current status: RESOLVED).',
      ),
    );

    await expect(
      controller.resolve('request-1', resolveDto, user),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
