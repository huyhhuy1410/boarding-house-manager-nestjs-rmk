import { ExpenseCategory } from '../../generated/prisma/enums';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 'cmhouse123' })
  @IsString()
  @IsNotEmpty()
  boardingHouseId!: string;

  @ApiPropertyOptional({ example: 'cmrequest123' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  maintenanceRequestId?: string;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.MAINTENANCE })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Replace faucet' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Bought replacement faucet.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150000, minimum: 1 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: '2026-07-31T00:00:00.000Z', format: 'date-time' })
  @IsDateString()
  spentAt!: string;
}
