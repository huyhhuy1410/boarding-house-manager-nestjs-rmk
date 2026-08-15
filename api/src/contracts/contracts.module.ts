import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService],
  imports: [AuthModule],
})
export class ContractsModule {}
