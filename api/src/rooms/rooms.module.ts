import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  controllers: [RoomsController],
  providers: [RoomsService],
  imports: [AuthModule],
})
export class RoomsModule {}
