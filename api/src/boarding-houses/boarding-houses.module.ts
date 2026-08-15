import { Module } from '@nestjs/common';
import { BoardingHousesController } from './boarding-houses.controller';
import { BoardingHousesService } from './boarding-houses.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [BoardingHousesController],
  providers: [BoardingHousesService],
  imports: [AuthModule],
})
export class BoardingHousesModule {}
