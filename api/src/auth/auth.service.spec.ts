import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const user = {
  id: 'user-1',
  authUserId: 'auth-user-1',
  email: 'owner@example.com',
  name: 'Owner',
  role: 'OWNER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; upsert: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn(), upsert: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AuthService);
  });

  it('returns the provisioned application user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'OWNER' });
    await expect(
      service.requireApplicationUser('auth-user-1'),
    ).resolves.toEqual({ id: 'user-1', role: 'OWNER' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { authUserId: 'auth-user-1' },
      select: { id: true, role: true },
    });
  });

  it('rejects an authenticated user not provisioned in the application', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.requireApplicationUser('unknown-auth-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the complete profile from me', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', role: 'OWNER' })
      .mockResolvedValueOnce(user);
    await expect(service.me('auth-user-1')).resolves.toMatchObject({
      id: 'user-1',
      email: 'owner@example.com',
    });
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
    });
  });

  it('requires email when bootstrapping', async () => {
    await expect(service.bootstrap('auth-user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('upserts an owner and derives the display name from email', async () => {
    prisma.user.upsert.mockResolvedValue(user);
    await expect(
      service.bootstrap('auth-user-1', 'owner@example.com'),
    ).resolves.toMatchObject({ email: 'owner@example.com' });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { authUserId: 'auth-user-1' },
      update: { email: 'owner@example.com' },
      create: {
        authUserId: 'auth-user-1',
        email: 'owner@example.com',
        name: 'owner',
        role: 'OWNER',
      },
    });
  });
});
