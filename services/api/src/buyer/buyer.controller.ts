import {
  Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { BuyerService } from './buyer.service';
import { CreateOrderDto, UpsertBuyerProfileDto } from './buyer.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

@Controller('buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
export class BuyerController {
  constructor(private readonly buyer: BuyerService) {}

  @Post('profile')
  upsertProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertBuyerProfileDto) {
    return this.buyer.upsertProfile(user.sub, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.buyer.getProfile(user.sub);
  }

  @Get('listings')
  browse(
    @Query('lang') lang = 'ta',
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: string,
  ) {
    return this.buyer.browse({
      lang,
      category,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
      sort,
    });
  }

  @Get('listings/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Query('lang') lang = 'ta') {
    return this.buyer.listingDetail(id, lang);
  }

  @Post('orders')
  createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.buyer.createOrder(user.sub, dto);
  }

  @Get('orders')
  myOrders(@CurrentUser() user: AuthUser) {
    return this.buyer.myOrders(user.sub);
  }

  @Post('orders/:id/cancel')
  cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.buyer.cancelOrder(user.sub, id, body?.reason);
  }
}
