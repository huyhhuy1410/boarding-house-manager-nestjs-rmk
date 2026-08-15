import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { BoardingHousesModule } from './boarding-houses/boarding-houses.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { TenantsModule } from './tenants/tenants.module';
import { ContractsModule } from './contracts/contracts.module';
import { MeterReadingsModule } from './meter-readings/meter-readings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MaintenanceRequestsModule } from './maintenance-requests/maintenance-requests.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    PrismaModule,
    BoardingHousesModule,
    AuthModule,
    RoomsModule,
    TenantsModule,
    ContractsModule,
    MeterReadingsModule,
    InvoicesModule,
    MaintenanceRequestsModule,
    ExpensesModule,
  ],
})
export class AppModule {}
