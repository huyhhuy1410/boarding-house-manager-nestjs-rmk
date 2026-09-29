import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceItemType, InvoiceStatus } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from './invoices.service';

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed.', {
    code: 'P2002',
    clientVersion: 'test',
  });

const owner = { id: 'owner-1' };
const authUserId = 'auth-user-1';
const invoiceRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'invoice-1',
  contractId: 'contract-1',
  month: 2,
  year: 2026,
  status: InvoiceStatus.DRAFT,
  rentAmount: 3000000,
  electricityUsage: 20,
  electricityUnitPrice: 3500,
  waterUsage: 10,
  waterUnitPrice: 30000,
  total: 4070000,
  issuedAt: null,
  dueAt: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  ...overrides,
});

describe('InvoicesService', () => {
  let service: InvoicesService;
  let authService: { requireApplicationUser: jest.Mock };
  let prisma: {
    $transaction: jest.Mock;
    contract: { findFirst: jest.Mock };
    meterReading: { findUnique: jest.Mock; findFirst: jest.Mock };
    maintenanceRequest: { findMany: jest.Mock };
    invoice: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    authService = {
      requireApplicationUser: jest.fn().mockResolvedValue(owner),
    };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
      contract: { findFirst: jest.fn() },
      meterReading: { findUnique: jest.fn(), findFirst: jest.fn() },
      maintenanceRequest: { findMany: jest.fn().mockResolvedValue([]) },
      invoice: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(InvoicesService);
  });

  describe('create', () => {
    const dto = { contractId: 'contract-1', month: 2, year: 2026 };
    const activeContract = {
      id: 'contract-1',
      status: 'ACTIVE',
      roomId: 'room-1',
      tenantId: 'tenant-1',
      room: {
        rentAmount: 3000000,
        house: { electricityUnitPrice: 3500, waterUnitPrice: 30000 },
      },
    };

    it('calculates rent and utility totals as integer VND', async () => {
      prisma.contract.findFirst.mockResolvedValue(activeContract);
      prisma.meterReading.findUnique.mockResolvedValue({
        electricity: 120,
        water: 80,
      });
      prisma.meterReading.findFirst.mockResolvedValue({
        electricity: 100,
        water: 70,
      });
      prisma.invoice.create.mockResolvedValue(
        invoiceRecord({ total: 3370000 }),
      );

      await expect(service.create(dto, authUserId)).resolves.toMatchObject({
        total: 3370000,
      });
      // 3.000.000 rent + 20 * 3.500 điện + 10 * 30.000 nước = 3.370.000
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: InvoiceStatus.DRAFT,
          rentAmount: 3000000,
          electricityUsage: 20,
          waterUsage: 10,
          total: 3370000,
          items: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                type: InvoiceItemType.RENT,
                amount: 3000000,
              }),
              expect.objectContaining({
                type: InvoiceItemType.ELECTRICITY,
                amount: 70000,
              }),
              expect.objectContaining({
                type: InvoiceItemType.WATER,
                amount: 300000,
              }),
            ]),
          }),
        }),
        include: { items: true },
      });
    });

    // Business rule: phí sửa chữa không bao giờ vào hóa đơn tháng.
    // OWNER trả -> sinh Expense; TENANT trả -> tự thanh toán ngoài hệ thống.
    it('never queries maintenance requests and emits only rent/electricity/water items', async () => {
      prisma.contract.findFirst.mockResolvedValue(activeContract);
      prisma.meterReading.findUnique.mockResolvedValue({
        electricity: 120,
        water: 80,
      });
      prisma.meterReading.findFirst.mockResolvedValue({
        electricity: 100,
        water: 70,
      });
      prisma.invoice.create.mockResolvedValue(invoiceRecord());

      await service.create(dto, authUserId);

      expect(prisma.maintenanceRequest.findMany).not.toHaveBeenCalled();

      const items = prisma.invoice.create.mock.calls[0][0].data.items.create;
      expect(items).toHaveLength(3);
      expect(items.map((item: { type: string }) => item.type)).toEqual([
        InvoiceItemType.RENT,
        InvoiceItemType.ELECTRICITY,
        InvoiceItemType.WATER,
      ]);
    });

    it('rejects a non-active or foreign contract', async () => {
      prisma.contract.findFirst.mockResolvedValue(null);
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.meterReading.findUnique).not.toHaveBeenCalled();
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('requires a current meter reading', async () => {
      prisma.contract.findFirst.mockResolvedValue(activeContract);
      prisma.meterReading.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('rejects a reading lower than the previous reading', async () => {
      prisma.contract.findFirst.mockResolvedValue(activeContract);
      prisma.meterReading.findUnique.mockResolvedValue({
        electricity: 99,
        water: 80,
      });
      prisma.meterReading.findFirst.mockResolvedValue({
        electricity: 100,
        water: 70,
      });
      await expect(service.create(dto, authUserId)).rejects.toThrow(
        'Current meter reading cannot be lower than the previous reading.',
      );
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('treats the first invoice (no previous reading) as full usage', async () => {
      prisma.contract.findFirst.mockResolvedValue(activeContract);
      prisma.meterReading.findUnique.mockResolvedValue({
        electricity: 120,
        water: 80,
      });
      prisma.meterReading.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockResolvedValue(
        invoiceRecord({ total: 9000000 }),
      );

      await expect(service.create(dto, authUserId)).resolves.toMatchObject({
        total: 9000000,
      });
      // electricityUsage = 120 - 0, waterUsage = 80 - 0
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          electricityUsage: 120,
          waterUsage: 80,
        }),
        include: { items: true },
      });
    });

    it('maps a P2002 unique violation to a ConflictException on create', async () => {
      prisma.$transaction.mockRejectedValue(p2002());
      await expect(service.create(dto, authUserId)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows an unknown error from create', async () => {
      prisma.$transaction.mockRejectedValue(new Error('boom'));
      await expect(service.create(dto, authUserId)).rejects.toThrow('boom');
    });
  });

  describe('lifecycle', () => {
    // The state machine is a conditional write: the allowed source `status`
    // lives in the WHERE clause of the UPDATE, not in a TypeScript `if`
    // after a read. So these tests assert the `where` passed to updateMany,
    // and the "wrong state -> 409" cases are driven by mocking the
    // conditional write to match 0 rows, which is what the database does
    // when the predicate fails under concurrency.
    // State machine = conditional write: `status` nằm trong where của
    // chính lệnh UPDATE, không phải kiểm tra trước rồi update theo id.
    it('issues a draft invoice and sets a seven-day due date', async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue(
        invoiceRecord({ status: InvoiceStatus.ISSUED }),
      );

      await expect(
        service.issue('invoice-1', authUserId),
      ).resolves.toMatchObject({ status: InvoiceStatus.ISSUED });
      // Guard nằm trong where của updateMany -> atomic, không phải read-then-write.
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'invoice-1',
          status: InvoiceStatus.DRAFT,
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
        data: expect.objectContaining({
          status: InvoiceStatus.ISSUED,
          issuedAt: expect.any(Date),
          dueAt: expect.any(Date),
        }),
      });
      const data = prisma.invoice.updateMany.mock.calls[0][0].data;
      expect(data.dueAt.getTime() - data.issuedAt.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000,
      );
      // Toàn bộ transition nằm trong đúng một transaction.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('pays an issued invoice and sets paidAt', async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue(
        invoiceRecord({ status: InvoiceStatus.PAID, paidAt: new Date() }),
      );

      await expect(service.pay('invoice-1', authUserId)).resolves.toMatchObject(
        { status: InvoiceStatus.PAID },
      );
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'invoice-1',
          status: InvoiceStatus.ISSUED,
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
        data: { status: InvoiceStatus.PAID, paidAt: expect.any(Date) },
      });
    });

    it('voids a draft or issued invoice', async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue(
        invoiceRecord({ status: InvoiceStatus.VOID }),
      );

      await expect(
        service.void('invoice-1', authUserId),
      ).resolves.toMatchObject({ status: InvoiceStatus.VOID });
      // State machine nằm trong where clause: chỉ DRAFT/ISSUED mới void được.
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'invoice-1',
          status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] },
          contract: {
            tenant: { ownerId: owner.id },
            room: { house: { ownerId: owner.id } },
          },
        },
        data: { status: InvoiceStatus.VOID },
      });
    });

    it('rejects issuing an invoice outside the owner scope with a 404', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.issue('invoice-1', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.invoice.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('rejects paying an invoice outside the owner scope with a 404', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.pay('invoice-1', authUserId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.invoice.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('rejects voiding an invoice outside the owner scope with a 404', async () => {
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.void('invoice-1', authUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.invoice.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it.each([
      [
        'issue',
        InvoiceStatus.ISSUED,
        'Only DRAFT invoices can be issued (current status: ISSUED).',
      ],
      [
        'pay',
        InvoiceStatus.DRAFT,
        'Only ISSUED invoices can be paid (current status: DRAFT).',
      ],
      [
        'void',
        InvoiceStatus.PAID,
        'Only DRAFT or ISSUED invoices can be voided (current status: PAID).',
      ],
      [
        'void',
        InvoiceStatus.VOID,
        'Only DRAFT or ISSUED invoices can be voided (current status: VOID).',
      ],
    ])(
      // Table: [action, status the row currently has, expected message].
      // Each row is a transition whose source state is not allowed, so the
      // conditional write matches 0 rows while the owner is correct -> 409.
      'rejects %s on an invoice in the wrong state with a 409',
      async (action, status, message) => {
        // Cổng atomic không match (count === 0) và record vẫn thuộc owner ->
        // sai state, không phải sai quyền -> 409 kèm status hiện tại.
        prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
        prisma.invoice.findFirst.mockResolvedValue({ status });

        const call = () =>
          action === 'issue'
            ? service.issue('invoice-1', authUserId)
            : action === 'pay'
              ? service.pay('invoice-1', authUserId)
              : service.void('invoice-1', authUserId);

        await expect(call()).rejects.toBeInstanceOf(ConflictException);
        await expect(call()).rejects.toThrow(message);
        expect(prisma.invoice.findUniqueOrThrow).not.toHaveBeenCalled();
      },
    );

    it('never voids a PAID invoice even when the guard does not match', async () => {
      // The old void() read the status, then updated by `id` outside a
      // transaction, so a pay() running concurrently could be overwritten
      // with VOID. With a conditional write, PAID is never a source state
      // of VOID, so a collected payment can not be un-collected.
      prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
      prisma.invoice.findFirst.mockResolvedValue({
        status: InvoiceStatus.PAID,
      });

      await expect(
        service.void('invoice-1', authUserId),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: InvoiceStatus.VOID },
          where: expect.objectContaining({
            status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] },
          }),
        }),
      );
    });
  });

  it('finds invoices only within owner scope and period order', async () => {
    prisma.invoice.findMany.mockResolvedValue([invoiceRecord()]);
    await expect(service.findAll(authUserId)).resolves.toHaveLength(1);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  });

  it('finds a single invoice in the owner scope', async () => {
    prisma.invoice.findFirst.mockResolvedValue(invoiceRecord());
    await expect(
      service.findOne('invoice-1', authUserId),
    ).resolves.toMatchObject({ id: 'invoice-1' });
  });

  it('rejects a single invoice outside the owner scope', async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);
    await expect(
      service.findOne('invoice-other', authUserId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
