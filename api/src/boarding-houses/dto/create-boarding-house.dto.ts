import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBoardingHouseDto {
  @ApiProperty({ example: 'An Tam Boarding House' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '123 Nguyen Trai, District 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;
}
