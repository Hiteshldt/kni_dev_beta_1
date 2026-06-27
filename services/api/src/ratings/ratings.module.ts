import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [AuthModule],
  providers: [RatingsService, RolesGuard],
  controllers: [RatingsController],
})
export class RatingsModule {}
