import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReviewListingDto } from './admin.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('settings')
  getSettings() {
    return this.admin.getSettings();
  }

  @Post('settings')
  updateSettings(
    @Body() body: { autoApprove?: boolean; defaultMarginPct?: number; defaultFlatFee?: number },
  ) {
    return this.admin.updateSettings(body);
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Post('users/:id/block')
  setBlocked(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { blocked?: boolean },
  ) {
    return this.admin.setBlocked(id, body?.blocked !== false);
  }

  // --- Catalog management ---
  @Get('categories')
  categories() {
    return this.admin.categories();
  }

  @Post('categories')
  createCategory(@Body() body: any) {
    return this.admin.createCategory(body);
  }

  @Post('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.admin.updateCategory(id, body);
  }

  @Get('catalog')
  catalogItems() {
    return this.admin.catalogItems();
  }

  @Post('catalog')
  createCatalogItem(@Body() body: any) {
    return this.admin.createCatalogItem(body);
  }

  @Post('catalog/:id')
  updateCatalogItem(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.admin.updateCatalogItem(id, body);
  }

  @Get('orders')
  recentOrders() {
    return this.admin.recentOrders();
  }

  @Get('listings')
  reviewQueue() {
    return this.admin.reviewQueue();
  }

  @Get('drivers')
  pendingDrivers() {
    return this.admin.pendingDrivers();
  }

  @Post('drivers/:id/verify')
  verifyDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approve?: boolean },
  ) {
    return this.admin.verifyDriver(id, body?.approve !== false);
  }

  @Post('listings/:id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewListingDto,
  ) {
    return this.admin.review(user.sub, id, dto);
  }

  @Post('orders/:id/refund')
  refundOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.admin.refundOrder(id, body?.reason ?? 'Refunded by admin');
  }
}
