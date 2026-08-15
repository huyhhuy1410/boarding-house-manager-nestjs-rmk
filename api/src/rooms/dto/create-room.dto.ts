import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ example: 'A101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code!: string;

  @ApiProperty({ example: 3000000, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  rentAmount!: number;

  @ApiProperty({ example: 'cmhouse123' })
  @IsString()
  @IsNotEmpty()
  houseId!: string;
}
