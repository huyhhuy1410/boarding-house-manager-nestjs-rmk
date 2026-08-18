import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated dashboard stats' })
  @ApiOkResponse({
    type: DashboardResponseDto,
    description: 'Dashboard stats returned successfully.',
  })
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getStats(user.id);
  }
}
