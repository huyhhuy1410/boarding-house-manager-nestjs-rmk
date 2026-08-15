import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
}

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): { status: 'ok' } {
    return this.healthService.getHealth();
  }
}
