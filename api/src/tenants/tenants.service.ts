import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus, Prisma } from '../generated/prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { mapTenantResponse } from './dto/tenant-response.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateTenantDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          ownerId: owner.id,
          name: dto.name,
          phone: dto.phone,
          identityNumber: dto.identityNumber,
        },
      });

      return mapTenantResponse(tenant);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Identity number already exists.');
      }

      throw error;
    }
  }

  async findAll(authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        ownerId: owner.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tenants.map((tenant) => mapTenantResponse(tenant));
  }

  async findOne(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const tenant = await this.prisma.tenant.findFirst({
      where: { id, ownerId: owner.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return mapTenantResponse(tenant);
  }

  async update(id: string, dto: UpdateTenantDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const tenant = await this.prisma.tenant.findFirst({
      where: { id, ownerId: owner.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    try {
      const updated = await this.prisma.tenant.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          identityNumber: dto.identityNumber,
        },
      });

      return mapTenantResponse(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Identity number already exists.');
      }
      throw error;
    }
  }

  async remove(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const tenant = await this.prisma.tenant.findFirst({
      where: { id, ownerId: owner.id },
      include: {
        contracts: {
          where: { status: ContractStatus.ACTIVE },
          select: { id: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    // Same reasoning as rooms: a tenant with an active contract still owes
    // money on it, so the contract (and its invoices) must be ended first.
    if (tenant.contracts.length > 0) {
      throw new ConflictException(
        'Cannot delete tenant with active contracts.',
      );
    }

    const deleted = await this.prisma.tenant.delete({ where: { id } });
    return mapTenantResponse(deleted);
  }
}
