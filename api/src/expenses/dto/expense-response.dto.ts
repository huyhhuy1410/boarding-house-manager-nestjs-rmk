import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../generated/prisma/client';

class BoardingHouseBrief {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

class MaintenanceRequestBrief {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
}

export class ExpenseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() boardingHouseId!: string;
  @ApiPropertyOptional({ nullable: true }) maintenanceRequestId!: string | null;
  @ApiProperty({ enum: ExpenseCategory }) category!: ExpenseCategory;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() amount!: number;
  @ApiProperty({ type: String, format: 'date-time' }) spentAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiPropertyOptional({ type: BoardingHouseBrief })
  boardingHouse?: BoardingHouseBrief;
  @ApiPropertyOptional({ type: MaintenanceRequestBrief, nullable: true })
  maintenanceRequest?: MaintenanceRequestBrief | null;
}

export type ExpenseResponseSource = {
  id: string;
  boardingHouseId: string;
  maintenanceRequestId: string | null;
  category: ExpenseCategory;
  title: string;
  description: string | null;
  amount: number;
  spentAt: Date;
  createdAt: Date;
  updatedAt: Date;
  boardingHouse?: { id: string; name: string } | null;
  maintenanceRequest?: { id: string; title: string } | null;
};

export function mapExpenseResponse(
  expense: ExpenseResponseSource,
): ExpenseResponseDto {
  return {
    id: expense.id,
    boardingHouseId: expense.boardingHouseId,
    maintenanceRequestId: expense.maintenanceRequestId,
    category: expense.category,
    title: expense.title,
    description: expense.description,
    amount: expense.amount,
    spentAt: expense.spentAt,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    boardingHouse: expense.boardingHouse ?? undefined,
    maintenanceRequest: expense.maintenanceRequest ?? undefined,
  };
}
