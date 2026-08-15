import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ContractStatus } from '../generated/prisma/enums';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { GetContractsQueryDto } from './dto/get-contracts-query.dto';

describe('ContractsController', () => {
  let controller: ContractsController;
  let service: {
    create: jest.Mock;
    endContract: jest.Mock;
    getContracts: jest.Mock;
    getContract: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const contract = {
    id: 'contract-1',
    roomId: 'room-1',
    tenantId: 'tenant-1',
    status: ContractStatus.ACTIVE,
    deposit: 3000000,
  };
  const createDto: CreateContractDto = {
    roomId: 'room-1',
    tenantId: 'tenant-1',
    startsAt: '2026-07-01T00:00:00.000Z',
    deposit: 3000000,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      endContract: jest.fn(),
      getContracts: jest.fn(),
      getContract: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [{ provide: ContractsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(ContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(contract);

    await expect(controller.create(createDto, user)).resolves.toEqual(contract);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('endContract delegates contract id and user id to the service', async () => {
    service.endContract.mockResolvedValue({ ...contract, status: ContractStatus.ENDED });

    await expect(controller.endContract('contract-1', user)).resolves.toMatchObject({ status: ContractStatus.ENDED });
    expect(service.endContract).toHaveBeenCalledWith('contract-1', user.id);
  });

  it('getContracts delegates status filter and user id to the service', async () => {
    const query: GetContractsQueryDto = { status: ContractStatus.ACTIVE };
    service.getContracts.mockResolvedValue([contract]);

    await expect(controller.getContracts(user, query)).resolves.toEqual([contract]);
    expect(service.getContracts).toHaveBeenCalledWith(user.id, ContractStatus.ACTIVE);
  });

  it('getContracts passes undefined when no status filter is provided', async () => {
    const query: GetContractsQueryDto = {};
    service.getContracts.mockResolvedValue([]);

    await expect(controller.getContracts(user, query)).resolves.toEqual([]);
    expect(service.getContracts).toHaveBeenCalledWith(user.id, undefined);
  });

  it('getContract delegates contract id and user id to the service', async () => {
    service.getContract.mockResolvedValue(contract);

    await expect(controller.getContract('contract-1', user)).resolves.toEqual(contract);
    expect(service.getContract).toHaveBeenCalledWith('contract-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.endContract.mockRejectedValue(new ConflictException('Contract already ended.'));

    await expect(controller.endContract('contract-1', user)).rejects.toBeInstanceOf(ConflictException);
  });
});
