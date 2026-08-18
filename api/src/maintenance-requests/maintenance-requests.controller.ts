import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuthGuard } from '../auth/auth.guard';
import { ResolveMaintenanceRequestDto } from './dto/resolve-maintenance-request.dto';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MaintenanceRequestResponseDto } from './dto/maintenance-request-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';

// import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';

@UseGuards(AuthGuard)
@ApiTags('maintenance-requests')
@ApiBearerAuth()
@ApiAuthErrors()
@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(
    private readonly maintenanceRequestsService: MaintenanceRequestsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a maintenance request' })
  @ApiCreatedResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Room or active tenant not found.' })
  create(
    @Body() dto: CreateMaintenanceRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenanceRequestsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List maintenance requests' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one maintenance request' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance request not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.findOne(id, user.id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateMaintenanceRequestDto: UpdateMaintenanceRequestDto) {
  //   return this.maintenanceRequestsService.update(+id, updateMaintenanceRequestDto);
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an open maintenance request' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance request not found.' })
  @ApiConflictResponse({
    description:
      'Maintenance request cannot be deleted once it is resolved, cancelled, or has an actual cost.',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.remove(id, user.id);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start a maintenance request' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance request not found.' })
  @ApiConflictResponse({ description: 'Only OPEN requests can be started.' })
  start(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.start(id, user.id);
  }

  @Patch(':id/resolve')
  @ApiOperation({
    summary: 'Resolve a maintenance request',
    description:
      'chargeTo OWNER creates a MAINTENANCE expense when actualCost > 0. ' +
      'chargeTo TENANT is settled directly between tenant and landlord: ' +
      'no expense is created and nothing is added to the monthly invoice. ' +
      'chargeTo TENANT requires the request to have a tenant.',
  })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance request not found.' })
  @ApiConflictResponse({
    description:
      'Only IN_PROGRESS requests can be resolved, or chargeTo TENANT is set on a request without a tenant.',
  })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveMaintenanceRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenanceRequestsService.resolve(id, dto, user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a maintenance request' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Maintenance request not found.' })
  @ApiConflictResponse({
    description: 'Only OPEN or IN_PROGRESS requests can be cancelled.',
  })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.cancel(id, user.id);
  }
}
