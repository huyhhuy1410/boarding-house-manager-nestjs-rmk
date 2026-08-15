import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('expenses')
@ApiTags('expenses')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  @ApiCreatedResponse({
    type: ExpenseResponseDto,
    description: 'Expense created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Expense payload is invalid.' })
  @ApiNotFoundResponse({
    description: 'Boarding house or maintenance request not found.',
  })
  create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.create(createExpenseDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List owner expenses' })
  @ApiOkResponse({
    type: ExpenseResponseDto,
    isArray: true,
    description: 'Expenses returned successfully.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.findAll(user.id);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get one expense' })
  @ApiOkResponse({
    type: ExpenseResponseDto,
    description: 'Expense returned successfully.',
  })
  @ApiNotFoundResponse({ description: 'Expense not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.findOne(id, user.id);
  }
}
