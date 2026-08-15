import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MeterReadingsService } from './meter-readings.service';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { GetMeterReadingsQueryDto } from './dto/get-meter-readings-query.dto';
import { MeterReadingResponseDto } from './dto/meter-reading-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('meter-readings')
@ApiBearerAuth()
@ApiAuthErrors()
@Controller('meter-readings')
@UseGuards(AuthGuard)
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a meter reading' })
  @ApiCreatedResponse({ type: MeterReadingResponseDto })
  @ApiBadRequestResponse({
    description: 'New readings cannot be lower than previous readings.',
  })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  @ApiConflictResponse({
    description: 'A reading already exists for this room and period.',
  })
  create(
    @Body() dto: CreateMeterReadingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meterReadingsService.create(dto, user.id);
  }
  @Get()
  @ApiOperation({ summary: 'List meter readings for a room' })
  @ApiOkResponse({ type: MeterReadingResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  findAll(
    @Query() query: GetMeterReadingsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meterReadingsService.findAll(query, user.id);
  }
}
