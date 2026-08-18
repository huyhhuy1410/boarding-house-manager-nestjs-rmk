import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const tenant = {
    id: 'tenant-1',
    name: 'Nguyen Van A',
    phone: '0901234567',
    identityNumber: '079123456789',
  };
  const createDto: CreateTenantDto = {
    name: 'Nguyen Van A',
    phone: '0901234567',
  };
  const updateDto: UpdateTenantDto = { phone: '0912345678' };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [{ provide: TenantsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(TenantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(tenant);

    await expect(controller.create(createDto, user)).resolves.toEqual(tenant);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('findAll delegates the authenticated user id to the service', async () => {
    service.findAll.mockResolvedValue([tenant]);

    await expect(controller.findAll(user)).resolves.toEqual([tenant]);
    expect(service.findAll).toHaveBeenCalledWith(user.id);
  });

  it('findOne delegates id and user id to the service', async () => {
    service.findOne.mockResolvedValue(tenant);

    await expect(controller.findOne('tenant-1', user)).resolves.toEqual(tenant);
    expect(service.findOne).toHaveBeenCalledWith('tenant-1', user.id);
  });

  it('update delegates id, dto and user id to the service', async () => {
    service.update.mockResolvedValue({ ...tenant, phone: '0912345678' });

    await expect(
      controller.update('tenant-1', updateDto, user),
    ).resolves.toMatchObject({ phone: '0912345678' });
    expect(service.update).toHaveBeenCalledWith('tenant-1', updateDto, user.id);
  });

  it('remove delegates id and user id to the service', async () => {
    service.remove.mockResolvedValue(tenant);

    await expect(controller.remove('tenant-1', user)).resolves.toEqual(tenant);
    expect(service.remove).toHaveBeenCalledWith('tenant-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.remove.mockRejectedValue(
      new ConflictException('Tenant has active contracts.'),
    );

    await expect(controller.remove('tenant-1', user)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
