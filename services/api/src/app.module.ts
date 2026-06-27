import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { SellerModule } from './seller/seller.module';
import { AdminModule } from './admin/admin.module';
import { BuyerModule } from './buyer/buyer.module';
import { PaymentsModule } from './payments/payments.module';
import { DriverModule } from './driver/driver.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { PaymentProviderModule } from './payments/provider/payment-provider.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PaymentProviderModule,
    DbModule,
    AuthModule,
    CatalogModule,
    SellerModule,
    AdminModule,
    BuyerModule,
    PaymentsModule,
    DriverModule,
    NotificationsModule,
    RatingsModule,
    UploadsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
