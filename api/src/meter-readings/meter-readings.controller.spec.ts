import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { GetMeterReadingsQueryDto } from './dto/get-meter-readings-query.dto';

describe('MeterReadingsController', () => {
  let controller: MeterReadingsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const reading = {
    id: 'reading-1',
    roomId: 'room-1',
    month: 7,
    year: 2026,
    electricity: 123456,
    water: 654321,
  };
  const createDto: CreateMeterReadingDto = {
    roomId: 'room-1',
    month: 7,
    year: 2026,
    electricity: 123456,
    water: 654321,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeterReadingsController],
      providers: [{ provide: MeterReadingsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(MeterReadingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(reading);

    await expect(controller.create(createDto, user)).resolves.toEqual(reading);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('findAll delegates query and user id to the service', async () => {
    const query: GetMeterReadingsQueryDto = {
      roomId: 'room-1',
      month: 7,
      year: 2026,
    };
    service.findAll.mockResolvedValue([reading]);

    await expect(controller.findAll(query, user)).resolves.toEqual([reading]);
    expect(service.findAll).toHaveBeenCalledWith(query, user.id);
  });

  it('findAll passes an unfiltered-period query unchanged', async () => {
    const query: GetMeterReadingsQueryDto = { roomId: 'room-1' };
    service.findAll.mockResolvedValue([]);

    await expect(controller.findAll(query, user)).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith(query, user.id);
  });

  it('propagates service exceptions', async () => {
    service.create.mockRejectedValue(
      new ConflictException(
        'A reading already exists for this room and period.',
      ),
    );

    await expect(controller.create(createDto, user)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
