import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

class PayDto {
  @IsOptional() @IsString()
  pgRef?: string; // real Razorpay payment id in prod
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('order/:id/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayDto,
  ) {
    return this.payments.payOrder(user.sub, id, dto.pgRef);
  }
}
