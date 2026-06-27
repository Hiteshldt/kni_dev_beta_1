import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [DriverController],
  providers: [DriverService, RolesGuard],
})
export class DriverModule {}
