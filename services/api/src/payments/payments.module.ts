import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { PaymentsService } from './payments.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, RolesGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
