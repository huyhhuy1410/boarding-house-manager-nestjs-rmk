import { Max, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeterReadingDto {
  @ApiProperty({ example: 'cmroom123' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({ example: 7, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 2026, minimum: 2000 })
  @IsInt()
  @Min(2000)
  year!: number;

  @ApiProperty({ example: 123456, minimum: 0 })
  @IsInt()
  @Min(0)
  electricity!: number;

  @ApiProperty({ example: 654321, minimum: 0 })
  @IsInt()
  @Min(0)
  water!: number;
}
