import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenanceRequestDto } from './create-maintenance-request.dto';

export class UpdateMaintenanceRequestDto extends PartialType(
  CreateMaintenanceRequestDto,
) {}
