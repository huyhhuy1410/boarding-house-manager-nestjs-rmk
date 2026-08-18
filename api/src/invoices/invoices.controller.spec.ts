import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { InvoiceStatus } from '../generated/prisma/enums';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    issue: jest.Mock;
    pay: jest.Mock;
    void: jest.Mock;
  };

  const user: AuthenticatedUser = { id: 'user-1', email: 'owner@example.com' };
  const invoice = {
    id: 'invoice-1',
    contractId: 'contract-1',
    month: 7,
    year: 2026,
    status: InvoiceStatus.DRAFT,
    total: 4070000,
  };
  const createDto: CreateInvoiceDto = {
    contractId: 'contract-1',
    month: 7,
    year: 2026,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      issue: jest.fn(),
      pay: jest.fn(),
      void: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get(InvoicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates dto and user id to the service', async () => {
    service.create.mockResolvedValue(invoice);

    await expect(controller.create(createDto, user)).resolves.toEqual(invoice);
    expect(service.create).toHaveBeenCalledWith(createDto, user.id);
  });

  it('findAll delegates the authenticated user id to the service', async () => {
    service.findAll.mockResolvedValue([invoice]);

    await expect(controller.findAll(user)).resolves.toEqual([invoice]);
    expect(service.findAll).toHaveBeenCalledWith(user.id);
  });

  it('findOne delegates invoice id and user id to the service', async () => {
    service.findOne.mockResolvedValue(invoice);

    await expect(controller.findOne('invoice-1', user)).resolves.toEqual(
      invoice,
    );
    expect(service.findOne).toHaveBeenCalledWith('invoice-1', user.id);
  });

  it('issue delegates invoice id and user id to the service', async () => {
    service.issue.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.ISSUED,
    });

    await expect(controller.issue('invoice-1', user)).resolves.toMatchObject({
      status: InvoiceStatus.ISSUED,
    });
    expect(service.issue).toHaveBeenCalledWith('invoice-1', user.id);
  });

  it('pay delegates invoice id and user id to the service', async () => {
    service.pay.mockResolvedValue({ ...invoice, status: InvoiceStatus.PAID });

    await expect(controller.pay('invoice-1', user)).resolves.toMatchObject({
      status: InvoiceStatus.PAID,
    });
    expect(service.pay).toHaveBeenCalledWith('invoice-1', user.id);
  });

  it('void delegates invoice id and user id to the service', async () => {
    service.void.mockResolvedValue({ ...invoice, status: InvoiceStatus.VOID });

    await expect(controller.void('invoice-1', user)).resolves.toMatchObject({
      status: InvoiceStatus.VOID,
    });
    expect(service.void).toHaveBeenCalledWith('invoice-1', user.id);
  });

  it('propagates service exceptions', async () => {
    service.void.mockRejectedValue(
      new ConflictException('Only DRAFT or ISSUED invoices can be voided.'),
    );

    await expect(controller.void('invoice-1', user)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
