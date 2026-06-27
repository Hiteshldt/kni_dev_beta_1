import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SellerService } from './seller.service';
import { CreateListingDto, UpsertSellerProfileDto } from './seller.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller')
export class SellerController {
  constructor(private readonly seller: SellerService) {}

  @Post('profile')
  upsertProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertSellerProfileDto) {
    return this.seller.upsertProfile(user.sub, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.seller.getProfile(user.sub);
  }

  @Post('listings')
  createListing(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.seller.createListing(user.sub, dto);
  }

  @Get('listings')
  myListings(@CurrentUser() user: AuthUser) {
    return this.seller.myListings(user.sub);
  }
}
