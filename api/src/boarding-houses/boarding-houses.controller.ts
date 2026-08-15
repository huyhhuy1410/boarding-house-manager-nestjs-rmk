import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BoardingHousesService } from './boarding-houses.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateBoardingHouseDto } from './dto/create-boarding-house.dto';
import { UpdateBoardingHouseDto } from './dto/update-boarding-house.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { BoardingHouseResponseDto } from './dto/boarding-house-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('boarding-houses')
@ApiTags('boarding-houses')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class BoardingHousesController {
  constructor(private readonly boardingHousesService: BoardingHousesService) {}

  @Get()
  @ApiOperation({ summary: 'List owner boarding houses' })
  @ApiOkResponse({ type: BoardingHouseResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.boardingHousesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one boarding house' })
  @ApiOkResponse({ type: BoardingHouseResponseDto })
  @ApiNotFoundResponse({ description: 'Boarding house not found.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.boardingHousesService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a boarding house' })
  @ApiCreatedResponse({ type: BoardingHouseResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBoardingHouseDto,
  ) {
    return this.boardingHousesService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a boarding house' })
  @ApiOkResponse({ type: BoardingHouseResponseDto })
  @ApiNotFoundResponse({ description: 'Boarding house not found.' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBoardingHouseDto,
  ) {
    return this.boardingHousesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a boarding house' })
  @ApiOkResponse({ description: 'Boarding house deleted.' })
  @ApiNotFoundResponse({ description: 'Boarding house not found.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.boardingHousesService.remove(id, user.id);
  }
}
