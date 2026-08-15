import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
  imports: [AuthModule],
})
export class TenantsModule {}
