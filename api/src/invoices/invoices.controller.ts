import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
@Controller('invoices')
@ApiTags('invoices')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft invoice' })
  @ApiCreatedResponse({
    type: InvoiceResponseDto,
    description: 'Invoice created.',
  })
  @ApiBadRequestResponse({
    description: 'Current meter reading is lower than the previous reading.',
  })
  @ApiNotFoundResponse({
    description: 'Active contract or meter reading not found.',
  })
  @ApiConflictResponse({
    description: 'Invoice already exists for this contract and period.',
  })
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.create(createInvoiceDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List owner invoices' })
  @ApiOkResponse({ type: InvoiceResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one invoice' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.findOne(id, user.id);
  }
  @Post(':id/issue')
  @ApiOperation({ summary: 'Issue an invoice' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  // 404 = unknown invoice or not yours; 409 = yours, wrong state.
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiConflictResponse({ description: 'Only DRAFT invoices can be issued.' })
  issue(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.issue(id, user.id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiConflictResponse({ description: 'Only ISSUED invoices can be paid.' })
  pay(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.pay(id, user.id);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void an invoice' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiConflictResponse({
    description: 'Only DRAFT or ISSUED invoices can be voided.',
  })
  void(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.void(id, user.id);
  }
}
