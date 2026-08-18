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

  async issue(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const issuedAt = new Date();
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + 7);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id,
          status: InvoiceStatus.DRAFT,
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.ISSUED,
          issuedAt,
          dueAt,
        },
      });

      return mapInvoiceResponse(updatedInvoice);
    });
  }

  async pay(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id,
          status: InvoiceStatus.ISSUED,
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      return mapInvoiceResponse(updatedInvoice);
    });
  }

  async void(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] },
        contract: {
          tenant: { ownerId: owner.id },
          room: { house: { ownerId: owner.id } },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or cannot be voided.');
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
    });

    return mapInvoiceResponse(updatedInvoice);
  }
}
