import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthGuard, AuthService],
  exports: [AuthGuard, AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
