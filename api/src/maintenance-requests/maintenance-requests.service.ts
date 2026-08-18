import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
// import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Prisma } from '../generated/prisma/client';
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

/**
 * Các status còn "sống" — cho phép cancel/delete.
 */
const OPEN_STATUSES = [
  MaintenanceRequestStatus.OPEN,
  MaintenanceRequestStatus.IN_PROGRESS,
];

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Chỉ gọi khi một conditional write (updateMany/deleteMany) trả về count === 0.
   * Đọc lại record để phân biệt hai nguyên nhân:
   *  - không tồn tại / không thuộc owner  -> 404 NotFound (throw luôn tại đây)
   *  - tồn tại nhưng sai state            -> caller throw 409 Conflict kèm status hiện tại
   */
  private async requireOwnedRequest(
    tx: Prisma.TransactionClient,
    id: string,
    ownerId: string,
  ) {
    const existing = await tx.maintenanceRequest.findFirst({
      where: {
        id,
        room: { house: { ownerId } },
      },
      select: { status: true },
    });

    if (!existing) {
      throw new NotFoundException('Maintenance request not found.');
    }

    return existing;
  }

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

    return this.prisma.$transaction(async (tx) => {
      // Đọc trước để có payload trả về (deleteMany không trả record).
      const request = await tx.maintenanceRequest.findFirst({
        where: {
          id,
          room: { house: { ownerId: owner.id } },
        },
      });

      if (!request) {
        throw new NotFoundException('Maintenance request not found.');
      }

      // Cổng atomic: điều kiện status/actualCost nằm TRONG where của deleteMany,
      // nên hai request đồng thời chỉ có một cái đạt count === 1.
      const { count } = await tx.maintenanceRequest.deleteMany({
        where: {
          id,
          status: { in: OPEN_STATUSES },
          actualCost: null,
          room: { house: { ownerId: owner.id } },
        },
      });

      if (count === 0) {
        throw new ConflictException(
          'Maintenance request cannot be deleted once it is resolved, cancelled, or has an actual cost.',
        );
      }

      return mapMaintenanceRequestResponse(request);
    });
  }

  // start, resolve, cancel
  async start(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.maintenanceRequest.updateMany({
        where: {
          id,
          status: MaintenanceRequestStatus.OPEN,
          room: { house: { ownerId: owner.id } },
        },
        data: { status: MaintenanceRequestStatus.IN_PROGRESS },
      });

      if (count === 0) {
        const existing = await this.requireOwnedRequest(tx, id, owner.id);
        throw new ConflictException(
          `Only OPEN requests can be started (current status: ${existing.status}).`,
        );
      }

      const started = await tx.maintenanceRequest.findUniqueOrThrow({
        where: { id },
      });

      return mapMaintenanceRequestResponse(started);
    });
  }

  async resolve(
    id: string,
    dto: ResolveMaintenanceRequestDto,
    authUserId: string,
  ) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const resolvedAt = new Date();

      // Cổng atomic chống double-resolve: `status: IN_PROGRESS` nằm trong where.
      // Postgres lock row ở UPDATE; request thứ hai re-evaluate where trên bản mới
      // (đã RESOLVED) -> không match -> count === 0 -> rollback, không tạo Expense trùng.
      const { count } = await tx.maintenanceRequest.updateMany({
        where: {
          id,
          status: MaintenanceRequestStatus.IN_PROGRESS,
          room: { house: { ownerId: owner.id } },
        },
        data: {
          status: MaintenanceRequestStatus.RESOLVED,
          resolvedAt,
          chargeTo: dto.chargeTo,
          estimatedCost: dto.estimatedCost,
          actualCost: dto.actualCost,
        },
      });

      if (count === 0) {
        const existing = await this.requireOwnedRequest(tx, id, owner.id);
        throw new ConflictException(
          `Only IN_PROGRESS requests can be resolved (current status: ${existing.status}).`,
        );
      }

      const resolved = await tx.maintenanceRequest.findUniqueOrThrow({
        where: { id },
        include: { room: { select: { houseId: true } } },
      });

      // Chọn "Khách thuê chịu phí" mà yêu cầu không gắn tenant là vô nghĩa
      // (không ai để chịu). Chặn ngay trong transaction trước khi commit RESOLVED.
      if (
        dto.chargeTo === MaintenanceRequestChargeTo.TENANT &&
        !resolved.tenantId
      ) {
        throw new ConflictException(
          'Cannot charge the tenant: this maintenance request has no tenant.',
        );
      }

      // Chỉ chủ nhà trả tiền mới sinh Expense. Phí do khách thuê chịu được
      // thanh toán trực tiếp ngoài hệ thống -> không Expense, không vào hóa đơn.
      if (
        dto.chargeTo === MaintenanceRequestChargeTo.OWNER &&
        dto.actualCost &&
        dto.actualCost > 0
      ) {
        await tx.expense.create({
          data: {
            boardingHouseId: resolved.room.houseId,
            maintenanceRequestId: resolved.id,
            category: ExpenseCategory.MAINTENANCE,
            title: `Sửa chữa: ${resolved.title}`,
            description: 'Chi phí sửa chữa do chủ nhà chi trả',
            amount: dto.actualCost,
            spentAt: resolvedAt,
          },
        });
      }

      return mapMaintenanceRequestResponse(resolved);
    });
  }

  async cancel(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.maintenanceRequest.updateMany({
        where: {
          id,
          status: { in: OPEN_STATUSES },
          room: { house: { ownerId: owner.id } },
        },
        data: { status: MaintenanceRequestStatus.CANCELLED },
      });

      if (count === 0) {
        const existing = await this.requireOwnedRequest(tx, id, owner.id);
        throw new ConflictException(
          `Only OPEN or IN_PROGRESS requests can be cancelled (current status: ${existing.status}).`,
        );
      }

      const cancelled = await tx.maintenanceRequest.findUniqueOrThrow({
        where: { id },
      });

      return mapMaintenanceRequestResponse(cancelled);
    });
  }
}
