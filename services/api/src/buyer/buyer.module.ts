import { Module } from '@nestjs/common';
import { BuyerController } from './buyer.controller';
import { BuyerService } from './buyer.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [BuyerController],
  providers: [BuyerService, RolesGuard],
})
export class BuyerModule {}
