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
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('rooms')
@ApiTags('rooms')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a room' })
  @ApiCreatedResponse({ type: RoomResponseDto })
  @ApiForbiddenResponse({ description: 'Room cannot be added to this house.' })
  @ApiConflictResponse({
    description: 'Room code already exists in this house.',
  })
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.create(dto, user.id);
  }
  @Get()
  @ApiOperation({ summary: 'List owner rooms' })
  @ApiOkResponse({ type: RoomResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.findAll(user.id);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get one room' })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.findOne(id, user.id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update a room' })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiBadRequestResponse({
    description: 'At least one room field is required.',
  })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  @ApiConflictResponse({
    description: 'Room code already exists in this house.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  @ApiConflictResponse({ description: 'Room has active contracts.' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.remove(id, user.id);
  }
}
