import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardingHousesService } from './boarding-houses.service';

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';
const house = (overrides: Record<string, unknown> = {}) => ({
  id: 'house-1', name: 'An Tam', address: '123 Main St', ownerId: owner.id,
  electricityUnitPrice: 3500, waterUnitPrice: 30000,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

describe('BoardingHousesService', () => {
  let service: BoardingHousesService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: { boardingHouse: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock } };

  beforeEach(async () => {
    authService = { requireApplicationUser: jest.fn().mockResolvedValue(owner) };
    prisma = { boardingHouse: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoardingHousesService, { provide: AuthService, useValue: authService }, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BoardingHousesService);
  });

  it('creates a house using the authenticated owner', async () => {
    prisma.boardingHouse.create.mockResolvedValue(house());
    await expect(service.create({ name: 'An Tam', address: '123 Main St' }, authUserId)).resolves.toMatchObject({ id: 'house-1' });
    expect(prisma.boardingHouse.create).toHaveBeenCalledWith({ data: { name: 'An Tam', address: '123 Main St', ownerId: owner.id } });
  });

  it('lists only houses owned by the authenticated user', async () => {
    prisma.boardingHouse.findMany.mockResolvedValue([house()]);
    await expect(service.findAll(authUserId)).resolves.toHaveLength(1);
    expect(prisma.boardingHouse.findMany).toHaveBeenCalledWith({ where: { ownerId: owner.id }, orderBy: { createdAt: 'desc' } });
  });

  it('rejects reading, updating or deleting another owner house', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue(null);
    await expect(service.findOne('house-other', authUserId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('house-other', authUserId, { name: 'Changed' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('house-other', authUserId)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.boardingHouse.update).not.toHaveBeenCalled();
    expect(prisma.boardingHouse.delete).not.toHaveBeenCalled();
  });

  it('updates only supplied fields, including integer utility prices', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue(house());
    prisma.boardingHouse.update.mockResolvedValue(house({ electricityUnitPrice: 4000 }));
    await expect(service.update('house-1', authUserId, { electricityUnitPrice: 4000 })).resolves.toMatchObject({ electricityUnitPrice: 4000 });
    expect(prisma.boardingHouse.update).toHaveBeenCalledWith({ where: { id: 'house-1' }, data: { electricityUnitPrice: 4000 } });
  });

  it('deletes an owned house and returns a confirmation', async () => {
    prisma.boardingHouse.findFirst.mockResolvedValue(house());
    prisma.boardingHouse.delete.mockResolvedValue(house());
    await expect(service.remove('house-1', authUserId)).resolves.toEqual({ message: 'Boarding house deleted.' });
  });
});
