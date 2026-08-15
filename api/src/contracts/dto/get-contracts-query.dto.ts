import { IsEnum, IsOptional } from 'class-validator';
import { ContractStatus } from '../../generated/prisma/enums';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetContractsQueryDto {
  @ApiPropertyOptional({ enum: ContractStatus, example: ContractStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
