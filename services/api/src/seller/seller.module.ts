import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [SellerController],
  providers: [SellerService, RolesGuard],
})
export class SellerModule {}
