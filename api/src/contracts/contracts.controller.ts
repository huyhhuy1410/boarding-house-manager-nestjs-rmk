import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateContractDto } from './dto/create-contract.dto';
import { ContractsService } from './contracts.service';
import { GetContractsQueryDto } from './dto/get-contracts-query.dto';
import { ContractResponseDto } from './dto/contract-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('contracts')
@ApiTags('contracts')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a contract' })
  @ApiCreatedResponse({ type: ContractResponseDto })
  @ApiNotFoundResponse({ description: 'Room or tenant not found.' })
  @ApiConflictResponse({ description: 'Room already has an active contract.' })
  create(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.create(dto, user.id);
  }
  @Post(':id/end')
  @ApiOperation({ summary: 'End a contract' })
  @ApiOkResponse({ type: ContractResponseDto })
  @ApiNotFoundResponse({ description: 'Contract not found.' })
  @ApiConflictResponse({ description: 'Contract already ended.' })
  @HttpCode(HttpStatus.OK)
  endContract(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.endContract(id, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List contracts' })
  @ApiOkResponse({ type: ContractResponseDto, isArray: true })
  getContracts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetContractsQueryDto,
  ) {
    return this.contractsService.getContracts(user.id, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one contract' })
  @ApiOkResponse({ type: ContractResponseDto })
  @ApiNotFoundResponse({ description: 'Contract not found.' })
  getContract(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.getContract(id, user.id);
  }
}
