import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { BoardingHousesController } from './boarding-houses.controller';
import { BoardingHousesService } from './boarding-houses.service';
import { CreateBoardingHouseDto } from './dto/create-boarding-house.dto';
import { UpdateBoardingHouseDto } from './dto/update-boarding-house.dto';

describe('BoardingHousesController', () => {
  let controller: BoardingHousesController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const house = {
    id: 'house-1',
    name: 'An Tam Boarding House',
    address: '123 Nguyen Trai, District 1',
    electricityUnitPrice: 3500,
    waterUnitPrice: 30000,
  };
  const createDto: CreateBoardingHouseDto = {
    name: 'An Tam',
    address: '123 Main St',
  };
  const updateDto: UpdateBoardingHouseDto = { electricityUnitPrice: 4000 };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardingHousesController],
      providers: [{ provide: BoardingHousesService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(BoardingHousesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates the authenticated user id to the service', async () => {
    service.findAll.mockResolvedValue([house]);

    await expect(controller.findAll(user)).resolves.toEqual([house]);
    expect(service.findAll).toHaveBeenCalledWith(user.id);
  });

  it('findOne delegates id and user id to the service', async () => {
    service.findOne.mockResolvedValue(house);

    await expect(controller.findOne('house-1', user)).resolves.toEqual(house);
    expect(service.findOne).toHaveBeenCalledWith('house-1', user.id);
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(house);

    await expect(controller.create(user, createDto)).resolves.toEqual(house);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('update delegates id, user id and dto to the service', async () => {
    service.update.mockResolvedValue(house);

    await expect(
      controller.update('house-1', user, updateDto),
    ).resolves.toEqual(house);
    expect(service.update).toHaveBeenCalledWith('house-1', user.id, updateDto);
  });

  it('remove delegates id and user id to the service', async () => {
    service.remove.mockResolvedValue({ message: 'Boarding house deleted.' });

    await expect(controller.remove('house-1', user)).resolves.toEqual({
      message: 'Boarding house deleted.',
    });
    expect(service.remove).toHaveBeenCalledWith('house-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.findOne.mockRejectedValue(
      new NotFoundException('Boarding house not found.'),
    );

    await expect(controller.findOne('missing', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
