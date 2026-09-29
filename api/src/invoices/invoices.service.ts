import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import {
  InvoiceResponseSource,
  mapInvoiceResponse,
} from './dto/invoice-response.dto';
// import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContractStatus,
  InvoiceStatus,
  Prisma,
  InvoiceItemType,
} from '../generated/prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}
  async create(dto: CreateInvoiceDto, authUserId: string) {
    // auth user
    const owner = await this.authService.requireApplicationUser(authUserId);
    // transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        // contract query
        const contract = await tx.contract.findFirst({
          where: {
            id: dto.contractId,
            status: ContractStatus.ACTIVE,
            tenant: {
              ownerId: owner.id,
            },
            room: {
              house: {
                ownerId: owner.id,
              },
            },
          },
          select: {
            id: true,
            status: true,
            roomId: true,
            room: {
              select: {
                rentAmount: true,
                house: {
                  select: {
                    electricityUnitPrice: true,
                    waterUnitPrice: true,
                  },
                },
              },
            },
          },
        });
        if (!contract) {
          throw new NotFoundException('Active contract not found.');
        }

        // meter reading queries
        const currentReading = await tx.meterReading.findUnique({
          where: {
            roomId_month_year: {
              roomId: contract.roomId,
              month: dto.month,
              year: dto.year,
            },
          },
          select: {
            electricity: true,
            water: true,
          },
        });
        if (!currentReading) {
          throw new NotFoundException('Meter reading not found.');
        }
        const previousReading = await tx.meterReading.findFirst({
          where: {
            roomId: contract.roomId,
            OR: [
              { year: { lt: dto.year } },
              {
                year: dto.year,
                month: { lt: dto.month },
              },
            ],
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          select: {
            electricity: true,
            water: true,
          },
        });
        const previousElectricity = previousReading?.electricity ?? 0;
        const previousWater = previousReading?.water ?? 0;

        const electricityUsage =
          currentReading.electricity - previousElectricity;
        const waterUsage = currentReading.water - previousWater;

        if (electricityUsage < 0 || waterUsage < 0) {
          throw new BadRequestException(
            'Current meter reading cannot be lower than the previous reading.',
          );
        }
        // invoice logic
        const rentAmount = contract.room.rentAmount;
        const electricityUnitPrice = contract.room.house.electricityUnitPrice;
        const waterUnitPrice = contract.room.house.waterUnitPrice;

        const rentTotal = rentAmount;
        const electricityTotal = electricityUsage * electricityUnitPrice;
        const waterTotal = waterUsage * waterUnitPrice;

        const total = rentTotal + electricityTotal + waterTotal;
        const invoice = await tx.invoice.create({
          data: {
            contractId: contract.id,
            month: dto.month,
            year: dto.year,
            status: InvoiceStatus.DRAFT,
            rentAmount,
            electricityUsage,
            electricityUnitPrice,
            waterUsage,
            waterUnitPrice,
            total,
            // Hóa đơn tháng CHỈ gồm tiền phòng + điện + nước.
            // Chi phí sửa chữa không bao giờ nằm ở đây:
            // - chargeTo OWNER  -> sinh Expense (chi phí vận hành nhà trọ)
            // - chargeTo TENANT -> khách thuê trả trực tiếp ngoài hệ thống
            items: {
              create: [
                {
                  type: InvoiceItemType.RENT,
                  description: 'Tiền phòng',
                  quantity: 1,
                  unitPrice: rentAmount,
                  amount: rentTotal,
                },
                {
                  type: InvoiceItemType.ELECTRICITY,
                  description: 'Tiền điện',
                  quantity: electricityUsage,
                  unitPrice: electricityUnitPrice,
                  amount: electricityTotal,
                },
                {
                  type: InvoiceItemType.WATER,
                  description: 'Tiền nước',
                  quantity: waterUsage,
                  unitPrice: waterUnitPrice,
                  amount: waterTotal,
                },
              ],
            },
          },
          include: { items: true },
        });

        return mapInvoiceResponse(invoice);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An invoice already exists for this contract and period.',
        );
      }

      throw error;
    }
  }

  async findAll(authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        contract: {
          tenant: {
            ownerId: owner.id,
          },
          room: {
            house: {
              ownerId: owner.id,
            },
          },
        },
      },
      include: {
        items: true,
        contract: {
          include: {
            tenant: true,
            room: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    return invoices.map((invoice) =>
      mapInvoiceResponse(invoice as unknown as InvoiceResponseSource),
    );
  }

  async findOne(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        contract: {
          tenant: {
            ownerId: owner.id,
          },
          room: {
            house: {
              ownerId: owner.id,
            },
          },
        },
      },
      include: {
        items: true,
        contract: {
          include: {
            tenant: true,
            room: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    return mapInvoiceResponse(invoice);
  }

  /**
   * Re-read after a conditional write matched 0 rows.
   *
   * NOT a re-authorization check: ownership is already part of the UPDATE's
   * WHERE clause, so anything the owner cannot touch arrives here as "not
   * found". This read only distinguishes the two 404-vs-409 reasons:
   *  - missing / not owned by this owner -> 404 (throw here)
   *  - owned but in the wrong state     -> caller throws 409 with the status
   *
   * Caller must be inside the same transaction; the value read here is a
   * diagnostic, not a decision input for a second write.
   */
  private async requireOwnedInvoice(
    tx: Prisma.TransactionClient,
    id: string,
    ownerId: string,
  ) {
    const existing = await tx.invoice.findFirst({
      where: {
        id,
        contract: {
          tenant: { ownerId },
          room: { house: { ownerId } },
        },
      },
      select: { status: true },
    });

    if (!existing) {
      throw new NotFoundException('Invoice not found.');
    }

    return existing;
  }

  /**
   * DRAFT -> ISSUED. Sets issuedAt and dueAt = issuedAt + 7 days in the same
   * UPDATE so the two timestamps can never drift apart.
   *
   * The guard lives in the `where` clause instead of an `if` on a prior read:
   * Postgres re-evaluates the predicate after acquiring the row lock, so two
   * concurrent issues cannot both match. Read-then-write (findFirst, then
   * update by id) lets both through.
   */
  async issue(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const issuedAt = new Date();
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + 7);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
        where: {
          id,
          status: InvoiceStatus.DRAFT,
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
        data: {
          status: InvoiceStatus.ISSUED,
          issuedAt,
          dueAt,
        },
      });

      if (count === 0) {
        const existing = await this.requireOwnedInvoice(tx, id, owner.id);
        throw new ConflictException(
          `Only DRAFT invoices can be issued (current status: ${existing.status}).`,
        );
      }

      const issued = await tx.invoice.findUniqueOrThrow({ where: { id } });

      return mapInvoiceResponse(issued);
    });
  }

  /**
   * ISSUED -> PAID. paidAt is written by the database, never taken from the
   * client, so the recorded payment time is trustworthy.
   *
   * Same conditional write as issue(): if a concurrent pay() commits first
   * this one matches 0 rows and returns 409 instead of double-recording
   * revenue on the dashboard.
   */
  async pay(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
        where: {
          id,
          status: InvoiceStatus.ISSUED,
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      if (count === 0) {
        const existing = await this.requireOwnedInvoice(tx, id, owner.id);
        throw new ConflictException(
          `Only ISSUED invoices can be paid (current status: ${existing.status}).`,
        );
      }

      const paid = await tx.invoice.findUniqueOrThrow({ where: { id } });

      return mapInvoiceResponse(paid);
    });
  }

  /**
   * DRAFT | ISSUED -> VOID, the exit branch. VOID is terminal: no transition
   * lists it as a source state, so a voided invoice can never be re-issued,
   * paid or voided again.
   *
   * The conditional write is what prevents a concurrent pay() from being
   * undone: once pay() commits, the row is PAID and this UPDATE matches 0
   * rows, so money already collected is never flipped to VOID.
   */
  async void(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
        where: {
          id,
          status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] },
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
        data: { status: InvoiceStatus.VOID },
      });

      if (count === 0) {
        const existing = await this.requireOwnedInvoice(tx, id, owner.id);
        throw new ConflictException(
          `Only DRAFT or ISSUED invoices can be voided (current status: ${existing.status}).`,
        );
      }

      const voided = await tx.invoice.findUniqueOrThrow({ where: { id } });

      return mapInvoiceResponse(voided);
    });
  }
}
