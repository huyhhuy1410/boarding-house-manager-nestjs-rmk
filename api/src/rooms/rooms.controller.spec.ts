import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

describe('RoomsController', () => {
  let controller: RoomsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const room = {
    id: 'room-1',
    code: 'A101',
    rentAmount: 3000000,
    houseId: 'house-1',
    status: 'VACANT',
  };
  const createDto: CreateRoomDto = {
    code: 'A101',
    rentAmount: 3000000,
    houseId: 'house-1',
  };
  const updateDto: UpdateRoomDto = { rentAmount: 3200000 };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [{ provide: RoomsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(RoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(room);

    await expect(controller.create(createDto, user)).resolves.toEqual(room);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('findAll delegates the authenticated user id to the service', async () => {
    service.findAll.mockResolvedValue([room]);

    await expect(controller.findAll(user)).resolves.toEqual([room]);
    expect(service.findAll).toHaveBeenCalledWith(user.id);
  });

  it('findOne delegates id and user id to the service', async () => {
    service.findOne.mockResolvedValue(room);

    await expect(controller.findOne('room-1', user)).resolves.toEqual(room);
    expect(service.findOne).toHaveBeenCalledWith('room-1', user.id);
  });

  it('update delegates id, dto and user id to the service', async () => {
    service.update.mockResolvedValue({ ...room, rentAmount: 3200000 });

    await expect(controller.update('room-1', updateDto, user)).resolves.toMatchObject({ rentAmount: 3200000 });
    expect(service.update).toHaveBeenCalledWith('room-1', updateDto, user.id);
  });

  it('remove delegates id and user id to the service', async () => {
    service.remove.mockResolvedValue(room);

    await expect(controller.remove('room-1', user)).resolves.toEqual(room);
    expect(service.remove).toHaveBeenCalledWith('room-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.remove.mockRejectedValue(new ConflictException('Room has active contracts.'));

    await expect(controller.remove('room-1', user)).rejects.toBeInstanceOf(ConflictException);
  });
});
