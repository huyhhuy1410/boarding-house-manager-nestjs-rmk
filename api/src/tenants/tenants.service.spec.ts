import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { TenantsService } from './tenants.service';

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
    code: 'P2002',
    clientVersion: 'test',
  });

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';
const tenant = (overrides: Record<string, unknown> = {}) => ({ id: 'tenant-1', ownerId: owner.id, name: 'Nguyen Van A', phone: '0900000000', identityNumber: '012345678901', createdAt: new Date(), updatedAt: new Date(), contracts: [], ...overrides });

describe('TenantsService', () => {
  let service: TenantsService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: { tenant: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock } };

  beforeEach(async () => {
    authService = { requireApplicationUser: jest.fn().mockResolvedValue(owner) };
    prisma = { tenant: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({ providers: [TenantsService, { provide: AuthService, useValue: authService }, { provide: PrismaService, useValue: prisma }] }).compile();
    service = module.get(TenantsService);
  });

  it('creates a tenant under the authenticated owner', async () => {
    prisma.tenant.create.mockResolvedValue(tenant());
    await expect(service.create({ name: 'Nguyen Van A', phone: '0900000000', identityNumber: '012345678901' }, authUserId)).resolves.toMatchObject({ id: 'tenant-1' });
    expect(prisma.tenant.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: owner.id, name: 'Nguyen Van A' }) });
  });

  it('maps a P2002 unique violation to a ConflictException on create', async () => {
    prisma.tenant.create.mockRejectedValue(p2002());
    await expect(service.create({ name: 'Dup', phone: '0900000000', identityNumber: '012345678901' }, authUserId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows an unknown error from create', async () => {
    prisma.tenant.create.mockRejectedValue(new Error('boom'));
    await expect(service.create({ name: 'Dup', phone: '0900000000' }, authUserId)).rejects.toThrow('boom');
  });

  it('lists only the current owner tenants', async () => {
    prisma.tenant.findMany.mockResolvedValue([tenant()]);
    await expect(service.findAll(authUserId)).resolves.toHaveLength(1);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith({ where: { ownerId: owner.id }, orderBy: { createdAt: 'desc' } });
  });

  it('rejects reading or updating another owner tenant', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    await expect(service.findOne('tenant-other', authUserId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-other', { name: 'Changed' }, authUserId)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });

  it('updates tenant contact fields', async () => {
    prisma.tenant.findFirst.mockResolvedValue(tenant());
    prisma.tenant.update.mockResolvedValue(tenant({ phone: '0911111111' }));
    await expect(service.update('tenant-1', { phone: '0911111111' }, authUserId)).resolves.toMatchObject({ phone: '0911111111' });
  });

  it('maps a P2002 unique violation to a ConflictException on update', async () => {
    prisma.tenant.findFirst.mockResolvedValue(tenant());
    prisma.tenant.update.mockRejectedValue(p2002());
    await expect(service.update('tenant-1', { identityNumber: '012345678901' }, authUserId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows an unknown error from update', async () => {
    prisma.tenant.findFirst.mockResolvedValue(tenant());
    prisma.tenant.update.mockRejectedValue(new Error('boom'));
    await expect(service.update('tenant-1', { name: 'Changed' }, authUserId)).rejects.toThrow('boom');
  });

  it('does not delete a tenant with an active contract', async () => {
    prisma.tenant.findFirst.mockResolvedValue(tenant({ contracts: [{ id: 'contract-1' }] }));
    await expect(service.remove('tenant-1', authUserId)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.tenant.delete).not.toHaveBeenCalled();
  });

  it('deletes a tenant without active contracts', async () => {
    prisma.tenant.findFirst.mockResolvedValue(tenant());
    prisma.tenant.delete.mockResolvedValue(tenant());
    await expect(service.remove('tenant-1', authUserId)).resolves.toMatchObject({ id: 'tenant-1' });
  });

  it('does not delete a tenant that does not exist in the owner scope', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    await expect(service.remove('tenant-1', authUserId)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tenant.delete).not.toHaveBeenCalled();
  });

  it('finds one tenant in the owner scope', async () => {
    prisma.tenant.findFirst.mockResolvedValue(tenant());
    await expect(service.findOne('tenant-1', authUserId)).resolves.toMatchObject({ id: 'tenant-1' });
  });
});
