import {
  Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import {
  UpsertDriverProfileDto, PickupDto, DeliverDto,
  CreateBatchDto, BatchPickupDto, BatchDeliverDto,
} from './driver.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/roles';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('driver')
export class DriverController {
  constructor(private readonly driver: DriverService) {}

  @Post('profile')
  upsertProfile(@CurrentUser() user: AuthUser, @Body() dto: UpsertDriverProfileDto) {
    return this.driver.upsertProfile(user.sub, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.driver.getProfile(user.sub);
  }

  @Get('jobs')
  jobs(
    @CurrentUser() user: AuthUser,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.driver.availableJobs(
      user.sub,
      lat != null ? Number(lat) : undefined,
      lng != null ? Number(lng) : undefined,
    );
  }

  @Get('shipments')
  myShipments(@CurrentUser() user: AuthUser) {
    return this.driver.myActiveShipments(user.sub);
  }

  @Post('jobs/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.driver.acceptJob(user.sub, id);
  }

  @Post('shipments/:id/pickup')
  pickup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PickupDto,
  ) {
    return this.driver.markPickedUp(user.sub, id, dto.code);
  }

  @Post('shipments/:id/deliver')
  deliver(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliverDto,
  ) {
    return this.driver.markDelivered(user.sub, id, dto.otp, dto.proofUrl);
  }

  @Get('earnings')
  earnings(@CurrentUser() user: AuthUser) {
    return this.driver.myEarnings(user.sub);
  }

  // --- BATCH MODE (Phase 2) ---

  @Get('batch/candidates')
  batchCandidates(
    @CurrentUser() user: AuthUser,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.driver.batchCandidates(
      user.sub,
      lat != null ? Number(lat) : undefined,
      lng != null ? Number(lng) : undefined,
    );
  }

  @Post('batch/plan')
  planBatch(
    @CurrentUser() user: AuthUser,
    @Body() body: { shipmentIds: string[] },
  ) {
    return this.driver.planBatchFromShipments(user.sub, body.shipmentIds);
  }

  @Post('batches')
  createBatch(@CurrentUser() user: AuthUser, @Body() dto: CreateBatchDto) {
    return this.driver.createBatch(user.sub, dto.shipmentIds, dto.scheduledFor);
  }

  @Get('batches')
  myBatches(@CurrentUser() user: AuthUser) {
    return this.driver.myBatches(user.sub);
  }

  @Post('batches/:id/start')
  startBatch(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.driver.startBatch(user.sub, id);
  }

  @Post('batches/:batchId/shipments/:shipmentId/pickup')
  batchPickup(
    @CurrentUser() user: AuthUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Body() dto: BatchPickupDto,
  ) {
    return this.driver.batchPickup(user.sub, batchId, shipmentId, dto.code);
  }

  @Post('batches/:batchId/shipments/:shipmentId/deliver')
  batchDeliver(
    @CurrentUser() user: AuthUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Body() dto: BatchDeliverDto,
  ) {
    return this.driver.batchDeliver(user.sub, batchId, shipmentId, dto.otp, dto.proofUrl);
  }
}