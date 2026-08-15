import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
// import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  ContractStatus,
  MaintenanceRequestStatus,
  MaintenanceRequestChargeTo,
  ExpenseCategory,
} from '../generated/prisma/enums';
import { ResolveMaintenanceRequestDto } from './dto/resolve-maintenance-request.dto';
import {
  MaintenanceRequestResponseSource,
  mapMaintenanceRequestResponse,
} from './dto/maintenance-request-response.dto';

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}
  async create(dto: CreateMaintenanceRequestDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({
        where: { id: dto.roomId, house: { ownerId: owner.id } },
        select: {
          id: true,
        },
      });

      if (!room) {
        throw new NotFoundException(`Room not found`);
      }
      let tenantId: string | undefined;

      if (dto.tenantId) {
        const tenant = await tx.tenant.findFirst({
          where: {
            id: dto.tenantId,
            ownerId: owner.id,
            contracts: {
              some: {
                roomId: room.id,
                status: ContractStatus.ACTIVE,
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (!tenant) {
          throw new NotFoundException('Tenant not found.');
        }

        tenantId = tenant.id;
      }
      const request = await tx.maintenanceRequest.create({
        data: {
          roomId: room.id,
          ...(tenantId ? { tenantId } : {}),
          title: dto.title,
          description: dto.description,
        },
      });

      return mapMaintenanceRequestResponse(request);
    });
  }

  async findAll(authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        room: {
          house: { ownerId: owner.id },
        },
      },
      include: {
        room: true,
        tenant: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) =>
      mapMaintenanceRequestResponse(
        request as MaintenanceRequestResponseSource,
      ),
    );
  }

  async findOne(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const maintenanceRequest = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id,
        room: {
          house: { ownerId: owner.id },
        },
      },
      include: {
        room: true,
        tenant: true,
      },
    });

    if (!maintenanceRequest) {
      throw new NotFoundException(`Maintenance request not found`);
    }

    return mapMaintenanceRequestResponse(maintenanceRequest);
  }

  // update(id: number, updateMaintenanceRequestDto: UpdateMaintenanceRequestDto) {
  //   return `This action updates a #${id} maintenanceRequest`;
  // }

  async remove(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const request = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id,
        status: {
          in: [
            MaintenanceRequestStatus.OPEN,
            MaintenanceRequestStatus.IN_PROGRESS,
          ],
        },
        actualCost: null,
        room: {
          house: {
            ownerId: owner.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request cannot be deleted.');
    }

    const deletedRequest = await this.prisma.maintenanceRequest.delete({
      where: { id: request.id },
    });

    return mapMaintenanceRequestResponse(deletedRequest);
  }
  // start, resolve, cancel
  async start(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const request = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id,
        room: {
          house: {
            ownerId: owner.id,
          },
        },
        status: MaintenanceRequestStatus.OPEN,
      },
      select: {
        id: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }

    const updatedRequest = await this.prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: { status: MaintenanceRequestStatus.IN_PROGRESS },
    });

    return mapMaintenanceRequestResponse(updatedRequest);
  }

  async resolve(
    id: string,
    dto: ResolveMaintenanceRequestDto,
    authUserId: string,
  ) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const request = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id,
        room: {
          house: {
            ownerId: owner.id,
          },
        },
        status: MaintenanceRequestStatus.IN_PROGRESS,
      },
      select: {
        id: true,
        tenantId: true,
        title: true,
        room: {
          select: {
            houseId: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }
    if (
      dto.chargeTo === MaintenanceRequestChargeTo.TENANT &&
      !request.tenantId
    ) {
      throw new BadRequestException(
        'A tenant is required when charging the repair to a tenant.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const resolvedAt = new Date();

      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: MaintenanceRequestStatus.RESOLVED,
          resolvedAt,
          chargeTo: dto.chargeTo,
          estimatedCost: dto.estimatedCost,
          actualCost: dto.actualCost,
        },
      });

      // Auto-create expense if actualCost is provided
      if (
        dto.chargeTo === MaintenanceRequestChargeTo.OWNER &&
        dto.actualCost &&
        dto.actualCost > 0
      ) {
        await tx.expense.create({
          data: {
            boardingHouseId: request.room.houseId,
            maintenanceRequestId: request.id,
            category: ExpenseCategory.MAINTENANCE,
            title: `Maintenance: ${request.title}`,
            description: 'Owner-paid maintenance expense',
            amount: dto.actualCost,
            spentAt: resolvedAt,
          },
        });
      }

      return mapMaintenanceRequestResponse(updatedRequest);
    });
  }

  async cancel(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const request = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id,
        room: {
          house: {
            ownerId: owner.id,
          },
        },
        status: {
          in: [
            MaintenanceRequestStatus.OPEN,
            MaintenanceRequestStatus.IN_PROGRESS,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }

    const updatedRequest = await this.prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: { status: MaintenanceRequestStatus.CANCELLED },
    });

    return mapMaintenanceRequestResponse(updatedRequest);
  }
}
