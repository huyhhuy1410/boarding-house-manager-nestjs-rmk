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
  ApiBadRequestResponse,
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
  @ApiNotFoundResponse({
    description: 'Maintenance request cannot be deleted.',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.remove(id, user.id);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start a maintenance request' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Open maintenance request not found.' })
  start(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.start(id, user.id);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve a maintenance request' })
  @ApiOkResponse({ type: MaintenanceRequestResponseDto })
  @ApiBadRequestResponse({
    description: 'A tenant is required when charging the repair to a tenant.',
  })
  @ApiNotFoundResponse({
    description: 'In-progress maintenance request not found.',
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
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceRequestsService.cancel(id, user.id);
  }
}
