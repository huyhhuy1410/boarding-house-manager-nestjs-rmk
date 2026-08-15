import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ContractStatus, RoomStatus } from '../generated/prisma/enums';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import {
  ContractResponseSource,
  mapContractResponse,
} from './dto/contract-response.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateContractDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const room = await tx.room.findFirst({
          where: {
            id: dto.roomId,
            house: { ownerId: owner.id },
          },
          select: { id: true, status: true },
        });

        if (!room) {
          throw new NotFoundException('Room not found.');
        }

        const tenant = await tx.tenant.findFirst({
          where: {
            id: dto.tenantId,
            ownerId: owner.id,
          },
          select: { id: true },
        });

        if (!tenant) {
          throw new NotFoundException('Tenant not found.');
        }

        if (room.status === RoomStatus.OCCUPIED) {
          throw new ConflictException('Room already has an active contract.');
        }

        const activeContract = await tx.contract.findFirst({
          where: {
            roomId: room.id,
            status: ContractStatus.ACTIVE,
          },
          select: { id: true },
        });

        if (activeContract) {
          throw new ConflictException('Room already has an active contract.');
        }

        const contract = await tx.contract.create({
          data: {
            roomId: room.id,
            tenantId: tenant.id,
            startsAt: new Date(dto.startsAt),
            deposit: dto.deposit,
            status: ContractStatus.ACTIVE,
          },
        });

        await tx.room.update({
          where: { id: room.id },
          data: { status: RoomStatus.OCCUPIED },
        });

        return mapContractResponse(contract);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Room already has an active contract.');
      }

      throw error;
    }
  }
  async endContract(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({
        where: {
          id,
          tenant: {
            ownerId: owner.id,
          },
          room: {
            house: {
              ownerId: owner.id,
            },
          },
        },
        select: { id: true, status: true, roomId: true },
      });

      if (!contract) {
        throw new NotFoundException('Contract not found.');
      }

      if (contract.status === ContractStatus.ENDED) {
        throw new ConflictException('Contract already ended.');
      }

      const updatedContract = await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.ENDED,
          endsAt: new Date(),
        },
      });

      await tx.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.VACANT },
      });

      return mapContractResponse(updatedContract);
    });
  }
  async getContract(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        tenant: { ownerId: owner.id },
        room: { house: { ownerId: owner.id } },
      },
      include: { tenant: true, room: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found.');
    }

    return mapContractResponse(contract as unknown as ContractResponseSource);
  }

  async getContracts(authUserId: string, status?: ContractStatus) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const contracts = await this.prisma.contract.findMany({
      where: {
        ...(status !== undefined ? { status } : {}),
        tenant: {
          ownerId: owner.id,
        },
        room: {
          house: {
            ownerId: owner.id,
          },
        },
      },
      include: {
        tenant: true,
        room: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return contracts.map((contract) =>
      mapContractResponse(contract as unknown as ContractResponseSource),
    );
  }
}
