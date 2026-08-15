import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
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

@Controller('tenants')
@ApiTags('tenants')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class TenantsController {
  constructor(private readonly tenantService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant' })
  @ApiCreatedResponse({ type: TenantResponseDto })
  @ApiConflictResponse({ description: 'Identity number already exists.' })
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List owner tenants' })
  @ApiOkResponse({ type: TenantResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiConflictResponse({ description: 'Identity number already exists.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiConflictResponse({ description: 'Tenant has active contracts.' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantService.remove(id, user.id);
  }
}
