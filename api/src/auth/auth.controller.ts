import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { ApplicationUserResponseDto } from './dto/application-user-response.dto';
import { ApiAuthErrors } from '../common/decorators/api-auth-errors.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('auth')
@ApiTags('auth')
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  @ApiOperation({ summary: 'Bootstrap application user' })
  @ApiCreatedResponse({ type: ApplicationUserResponseDto })
  bootstrap(@CurrentUser() payload: AuthenticatedUser) {
    return this.authService.bootstrap(payload.id, payload.email);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({ type: ApplicationUserResponseDto })
  me(@CurrentUser() payload: AuthenticatedUser) {
    return this.authService.me(payload.id);
  }
}
