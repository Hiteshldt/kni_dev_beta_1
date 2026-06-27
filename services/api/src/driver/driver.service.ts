import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { UpsertDriverProfileDto } from './driver.dto';
import { directEarnings, distanceKm } from '../common/logistics';
import { planBatch, BatchCandidate, BatchPlan } from '../common/batch-engine';
import { NotificationsService } from '../notifications/notifications.service';
import { recordSettlement } from '../common/settlement';
import { PAYMENT_PROVIDER, PaymentProvider } from '../payments/provider/payment-provider';
import { capturePayment, runPayout } from '../payments/payout-runner';

@Injectable()
export class DriverService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async upsertProfile(userId: string, dto: UpsertDriverProfileDto) {
    return this.db.one(
      `INSERT INTO driver_profiles (user_id, license_url, rc_url, vehicle_type, capacity_kg, bank_account, verify_status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         license_url = EXCLUDED.license_url, rc_url = EXCLUDED.rc_url,
         vehicle_type = EXCLUDED.vehicle_type, capacity_kg = EXCLUDED.capacity_kg,
         bank_account = EXCLUDED.bank_account
       RETURNING *`,
      [userId, dto.licenseUrl ?? null, dto.rcUrl ?? null, dto.vehicleType, dto.capacityKg, dto.bankAccount ?? null],
    );
  }

  private async requireVerifiedDriver(userId: string) {
    const d = await this.db.one<{ capacity_kg: string; verify_status: string }>(
      'SELECT capacity_kg, verify_status FROM driver_profiles WHERE user_id = $1',
      [userId],
    );
    if (!d) throw new BadRequestException('Complete driver onboarding first');
    if (d.verify_status !== 'verified') {
      throw new ForbiddenException('Your driver account is awaiting verification');
    }
    return { capacityKg: Number(d.capacity_kg) };
  }

  /** Nearby unassigned DIRECT jobs that fit the driver's capacity. */
  async availableJobs(userId: string, lat?: number, lng?: number) {
    const { capacityKg } = await this.requireVerifiedDriver(userId);
    const hasGeo = lat != null && lng != null;
    const distanceExpr = hasGeo
      ? `(6371 * acos(LEAST(1,
           cos(radians($2)) * cos(radians(s.pickup_lat)) * cos(radians(s.pickup_lng) - radians($3)) +
           sin(radians($2)) * sin(radians(s.pickup_lat)))))`
      : 'NULL::double precision';
    const params: any[] = [capacityKg];
    if (hasGeo) params.push(lat, lng);

    const rows = await this.db.query(
      `SELECT s.id AS shipment_id, s.order_id, s.weight_kg, s.distance_km,
              s.pickup_lat, s.pickup_lng, s.drop_lat, s.drop_lng,
              c.slug AS produce_slug, sp.name AS seller_name,
              ${distanceExpr} AS pickup_distance_km
         FROM shipments s
         JOIN orders o ON o.id = s.order_id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN listings l ON l.id = oi.listing_id
         JOIN produce_catalog c ON c.id = l.catalog_id
         LEFT JOIN seller_profiles sp ON sp.user_id = s.seller_id
        WHERE s.status = 'unassigned' AND s.mode = 'direct'
          AND s.weight_kg <= $1
        GROUP BY s.id, c.slug, sp.name
        ORDER BY pickup_distance_km ASC NULLS LAST, s.distance_km ASC`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      pickup_distance_km: r.pickup_distance_km != null ? Math.round(r.pickup_distance_km * 10) / 10 : null,
      est_earnings: directEarnings(Number(r.distance_km ?? 0)),
    }));
  }

  /** Returns the driver's profile or null (used for first-run onboarding). */
  async getProfile(userId: string) {
    return (await this.db.one('SELECT * FROM driver_profiles WHERE user_id = $1', [userId])) ?? null;
  }

  /** The driver's accepted direct shipments still in progress (assigned → in_transit). */
  async myActiveShipments(userId: string) {
    return this.db.query(
      `SELECT s.id AS shipment_id, s.order_id, s.status, s.weight_kg,
              s.pickup_lat, s.pickup_lng, s.drop_lat, s.drop_lng,
              c.slug AS produce_slug, sp.name AS seller_name
         FROM shipments s
         JOIN orders o ON o.id = s.order_id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN listings l ON l.id = oi.listing_id
         JOIN produce_catalog c ON c.id = l.catalog_id
         LEFT JOIN seller_profiles sp ON sp.user_id = s.seller_id
        WHERE s.driver_id = $1 AND s.mode = 'direct'
          AND s.status IN ('assigned','picked_up','in_transit')
        GROUP BY s.id, c.slug, sp.name
        ORDER BY s.status, s.id`,
      [userId],
    );
  }

  async acceptJob(userId: string, shipmentId: string) {
    const { capacityKg } = await this.requireVerifiedDriver(userId);
    return this.db.tx(async (client) => {
      const s = (
        await client.query('SELECT * FROM shipments WHERE id = $1 FOR UPDATE', [shipmentId])
      ).rows[0];
      if (!s) throw new NotFoundException('Job not found');
      if (s.status !== 'unassigned') throw new BadRequestException('Job already taken');
      if (Number(s.weight_kg) > capacityKg) {
        throw new BadRequestException('Load exceeds your vehicle capacity');
      }
      await client.query(
        `UPDATE shipments SET status = 'assigned', driver_id = $2 WHERE id = $1`,
        [shipmentId, userId],
      );
      await client.query(`UPDATE orders SET status = 'pickup_assigned' WHERE id = $1`, [s.order_id]);

      const buyerId = (await client.query('SELECT buyer_id FROM orders WHERE id = $1', [s.order_id]))
        .rows[0]?.buyer_id;
      if (buyerId) {
        await this.notifications.notify(buyerId, 'pickup_assigned', { orderShort: s.order_id.slice(0, 8) }, client);
      }
      return { shipment_id: shipmentId, status: 'assigned', order_id: s.order_id };
    });
  }

  async markPickedUp(userId: string, shipmentId: string, code: string) {
    return this.db.tx(async (client) => {
      const s = (
        await client.query('SELECT * FROM shipments WHERE id = $1 FOR UPDATE', [shipmentId])
      ).rows[0];
      if (!s) throw new NotFoundException('Shipment not found');
      if (s.driver_id !== userId) throw new ForbiddenException('Not your shipment');
      if (s.status !== 'assigned') throw new BadRequestException(`Shipment is '${s.status}'`);
      if (s.pickup_code !== code) throw new BadRequestException('Incorrect pickup code');

      await client.query(
        `UPDATE shipments SET status = 'picked_up', picked_at = now() WHERE id = $1`,
        [shipmentId],
      );
      await client.query(`UPDATE orders SET status = 'in_transit' WHERE id = $1`, [s.order_id]);

      const buyerId = (await client.query('SELECT buyer_id FROM orders WHERE id = $1', [s.order_id]))
        .rows[0]?.buyer_id;
      if (buyerId) {
        await this.notifications.notify(
          buyerId, 'picked_up', { orderShort: s.order_id.slice(0, 8), otp: s.drop_otp }, client,
        );
      }
      return { shipment_id: shipmentId, status: 'picked_up' };
    });
  }

  /** Verify drop OTP, mark delivered, and run settlement (capture + payouts). */
  async markDelivered(userId: string, shipmentId: string, otp: string, proofUrl?: string) {
    return this.db.tx(async (client) => {
      const s = (
        await client.query('SELECT * FROM shipments WHERE id = $1 FOR UPDATE', [shipmentId])
      ).rows[0];
      if (!s) throw new NotFoundException('Shipment not found');
      if (s.driver_id !== userId) throw new ForbiddenException('Not your shipment');
      if (s.status !== 'picked_up') throw new BadRequestException(`Shipment is '${s.status}'`);
      if (s.drop_otp !== otp) throw new BadRequestException('Incorrect delivery OTP');

      await client.query(
        `UPDATE shipments SET status = 'delivered', delivered_at = now(), proof_url = $2 WHERE id = $1`,
        [shipmentId, proofUrl ?? null],
      );
      await client.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [s.order_id]);

      // --- Settlement (PRD §7.6): capture escrow, release payouts ---
      await capturePayment(client, this.provider, s.order_id);

      // Seller payout(s): sum of farmer payout per seller for this order (paid via gateway).
      const sellerRows = (
        await client.query(
          `SELECT l.seller_id, sp.upi_id,
                  SUM(oi.qty * oi.payout_price)::numeric(14,2) AS amount
             FROM order_items oi
             JOIN listings l ON l.id = oi.listing_id
             LEFT JOIN seller_profiles sp ON sp.user_id = l.seller_id
            WHERE oi.order_id = $1
            GROUP BY l.seller_id, sp.upi_id`,
          [s.order_id],
        )
      ).rows;
      for (const sr of sellerRows) {
        await runPayout(client, this.provider, {
          payeeId: sr.seller_id, payeeType: 'seller', orderId: s.order_id,
          amount: Number(sr.amount), destination: sr.upi_id,
        });
      }

      // Driver earning (paid via gateway).
      const earning = directEarnings(Number(s.distance_km ?? 0));
      await runPayout(client, this.provider, {
        payeeId: userId, payeeType: 'driver', orderId: s.order_id, amount: earning,
      });

      // Per-order settlement record (gross / farmer / driver / margin split).
      const farmerTotal = sellerRows.reduce((sum, r) => sum + Number(r.amount), 0);
      const settlement = await recordSettlement(client, s.order_id, farmerTotal, earning);

      // Notify buyer (delivered), seller(s) (payout), driver (earning).
      const orderShort = s.order_id.slice(0, 8);
      const buyerId = (await client.query('SELECT buyer_id FROM orders WHERE id = $1', [s.order_id]))
        .rows[0]?.buyer_id;
      if (buyerId) await this.notifications.notify(buyerId, 'delivered', { orderShort }, client);
      for (const sr of sellerRows) {
        await this.notifications.notify(sr.seller_id, 'payout_released', { amount: Number(sr.amount) }, client);
      }
      await this.notifications.notify(userId, 'driver_earning', { amount: earning }, client);

      return {
        shipment_id: shipmentId,
        status: 'delivered',
        settlement: {
          payment: 'captured',
          seller_payouts: sellerRows.map((r) => ({ seller_id: r.seller_id, amount: Number(r.amount) })),
          driver_earning: earning,
          split: settlement,
        },
      };
    });
  }

  async myEarnings(userId: string) {
    const summary = await this.db.one<{ total: string; trips: string }>(
      `SELECT COALESCE(SUM(amount),0)::numeric(14,2) AS total, COUNT(*) AS trips
         FROM payouts WHERE payee_id = $1 AND payee_type = 'driver'`,
      [userId],
    );
    const recent = await this.db.query(
      `SELECT order_id, amount, status, gateway, gateway_ref, created_at
         FROM payouts WHERE payee_id = $1 AND payee_type = 'driver'
        ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );
    return { total: Number(summary?.total ?? 0), trips: Number(summary?.trips ?? 0), recent };
  }

  // --- BATCH MODE (Phase 2) ---

  /** List unassigned DIRECT shipments near the driver, filterable by capacity. */
  async batchCandidates(userId: string, lat?: number, lng?: number) {
    const { capacityKg } = await this.requireVerifiedDriver(userId);
    const hasGeo = lat != null && lng != null;
    const distanceExpr = hasGeo
      ? `(6371 * acos(LEAST(1,
           cos(radians($2)) * cos(radians(s.pickup_lat)) * cos(radians(s.pickup_lng) - radians($3)) +
           sin(radians($2)) * sin(radians(s.pickup_lat)))))`
      : 'NULL::double precision';
    const params: any[] = [capacityKg];
    if (hasGeo) params.push(lat, lng);

    return this.db.query(
      `SELECT s.id AS shipment_id, s.order_id, s.weight_kg, s.pickup_lat, s.pickup_lng,
              s.drop_lat, s.drop_lng, s.pickup_code, s.drop_otp, s.distance_km,
              ${distanceExpr} AS pickup_distance_km
         FROM shipments s
         JOIN orders o ON o.id = s.order_id
        WHERE s.status = 'unassigned' AND s.mode = 'direct' AND s.batch_id IS NULL
          AND s.weight_kg <= $1
        ORDER BY pickup_distance_km ASC NULLS LAST`,
      params,
    );
  }

  /** Plan a batch from selected shipment IDs. Bins by capacity, optimizes route. */
  async planBatchFromShipments(userId: string, shipmentIds: string[]): Promise<BatchPlan> {
    const { capacityKg } = await this.requireVerifiedDriver(userId);

    const rows = await this.db.query(
      `SELECT s.id AS shipment_id, s.order_id, s.weight_kg, s.pickup_lat, s.pickup_lng,
              s.drop_lat, s.drop_lng, s.pickup_code, s.drop_otp, s.distance_km
         FROM shipments s
        WHERE s.id = ANY($1) AND s.status = 'unassigned' AND s.batch_id IS NULL`,
      [shipmentIds],
    );

    if (rows.length === 0) throw new BadRequestException('No eligible shipments');
    if (rows.length !== shipmentIds.length) {
      throw new BadRequestException('Some shipments not found or already assigned');
    }

    const candidates: BatchCandidate[] = rows.map((r) => ({
      shipmentId: r.shipment_id,
      orderId: r.order_id,
      weightKg: Number(r.weight_kg),
      pickupLat: r.pickup_lat,
      pickupLng: r.pickup_lng,
      dropLat: r.drop_lat,
      dropLng: r.drop_lng,
      distance: Number(r.distance_km ?? 0),
      pickupCode: r.pickup_code,
      dropOtp: r.drop_otp,
    }));

    return planBatch(candidates, capacityKg);
  }

  /**
   * Create (persist) a batch from selected shipments. Re-plans server-side
   * (never trusts a client-supplied plan), links shipments, computes metrics.
   */
  async createBatch(userId: string, shipmentIds: string[], scheduledFor?: string) {
    // Re-plan from scratch so the persisted route/earnings can't be tampered with.
    const plan = await this.planBatchFromShipments(userId, shipmentIds);

    return this.db.tx(async (client) => {
      // Lock + sanity-check all shipments still unassigned and unbatched.
      const locked = (
        await client.query(
          `SELECT id FROM shipments
            WHERE id = ANY($1) AND status = 'unassigned' AND batch_id IS NULL
            FOR UPDATE`,
          [plan.shipmentIds],
        )
      ).rows;
      if (locked.length !== plan.shipmentIds.length) {
        throw new BadRequestException('Some shipments were already assigned; try again');
      }

      // Insert batch.
      const batch = (
        await client.query(
          `INSERT INTO batches (driver_id, status, scheduled_for, route_plan, total_km)
           VALUES ($1, 'planning', $2::date, $3, $4) RETURNING *`,
          [userId, scheduledFor ?? null, JSON.stringify(plan.routePlan), plan.totalKm],
        )
      ).rows[0];

      // Link shipments to batch.
      await client.query(
        `UPDATE shipments SET batch_id = $1 WHERE id = ANY($2)`,
        [batch.id, plan.shipmentIds],
      );

      // Insert metrics.
      await client.query(
        `INSERT INTO batch_metrics (batch_id, weight_kg, distance_km, num_stops, est_earnings, utilization)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [batch.id, plan.totalWeight, plan.totalKm, plan.totalStops, plan.estEarnings, plan.utilization],
      );

      return {
        batch_id: batch.id,
        status: batch.status,
        shipment_ids: plan.shipmentIds,
        route_plan: plan.routePlan,
        metrics: {
          total_km: plan.totalKm,
          total_stops: plan.totalStops,
          est_earnings: plan.estEarnings,
          utilization: plan.utilization,
          feasible: plan.feasible,
        },
      };
    });
  }

  /** List my batches. */
  async myBatches(userId: string) {
    return this.db.query(
      `SELECT b.*, m.weight_kg, m.distance_km, m.num_stops, m.est_earnings, m.utilization
         FROM batches b
         LEFT JOIN batch_metrics m ON m.batch_id = b.id
        WHERE b.driver_id = $1
        ORDER BY b.created_at DESC LIMIT 50`,
      [userId],
    );
  }

  /** Start executing a batch: transition to in_progress, assign shipments. */
  async startBatch(userId: string, batchId: string) {
    return this.db.tx(async (client) => {
      const b = (
        await client.query(`SELECT * FROM batches WHERE id = $1 AND driver_id = $2 FOR UPDATE`, [batchId, userId])
      ).rows[0];
      if (!b) throw new NotFoundException('Batch not found or not yours');
      if (b.status !== 'planning') throw new BadRequestException(`Batch is '${b.status}'`);

      await client.query(`UPDATE batches SET status = 'in_progress', started_at = now() WHERE id = $1`, [batchId]);

      // Transition all shipments in the batch to 'assigned' (will be picked up in sequence).
      await client.query(
        `UPDATE shipments SET status = 'assigned', driver_id = $1 WHERE batch_id = $2`,
        [userId, batchId],
      );

      // Mark all orders in the batch as pickup_assigned.
      await client.query(
        `UPDATE orders SET status = 'pickup_assigned'
         WHERE id IN (SELECT DISTINCT order_id FROM shipments WHERE batch_id = $1)`,
        [batchId],
      );

      return { batch_id: batchId, status: 'in_progress', shipment_count: (b.route_plan as any[]).length / 2 };
    });
  }

  /** Mark a shipment in a batch as picked up (driver verifies pickup code). */
  async batchPickup(userId: string, batchId: string, shipmentId: string, code: string) {
    return this.db.tx(async (client) => {
      const b = (
        await client.query(`SELECT * FROM batches WHERE id = $1 AND driver_id = $2 FOR UPDATE`, [batchId, userId])
      ).rows[0];
      if (!b) throw new NotFoundException('Batch not found');
      if (b.status !== 'in_progress') throw new BadRequestException(`Batch is '${b.status}'`);

      const s = (
        await client.query(`SELECT * FROM shipments WHERE id = $1 AND batch_id = $2 FOR UPDATE`, [
          shipmentId,
          batchId,
        ])
      ).rows[0];
      if (!s) throw new NotFoundException('Shipment not in this batch');
      if (s.status !== 'assigned') throw new BadRequestException(`Shipment is '${s.status}'`);
      if (s.pickup_code !== code) throw new BadRequestException('Incorrect pickup code');

      await client.query(
        `UPDATE shipments SET status = 'picked_up', picked_at = now() WHERE id = $1`,
        [shipmentId],
      );

      return { shipment_id: shipmentId, batch_id: batchId, status: 'picked_up' };
    });
  }

  /** Mark a shipment in a batch as delivered (driver verifies drop OTP). Settlement runs here. */
  async batchDeliver(userId: string, batchId: string, shipmentId: string, otp: string, proofUrl?: string) {
    return this.db.tx(async (client) => {
      const s = (
        await client.query(`SELECT * FROM shipments WHERE id = $1 AND batch_id = $2 FOR UPDATE`, [
          shipmentId,
          batchId,
        ])
      ).rows[0];
      if (!s) throw new NotFoundException('Shipment not in this batch');
      if (s.status !== 'picked_up') throw new BadRequestException(`Shipment is '${s.status}'`);
      if (s.driver_id !== userId) throw new ForbiddenException('Not your batch');
      if (s.drop_otp !== otp) throw new BadRequestException('Incorrect drop OTP');

      await client.query(
        `UPDATE shipments SET status = 'delivered', delivered_at = now(), proof_url = $2
         WHERE id = $1`,
        [shipmentId, proofUrl ?? null],
      );

      const order = (
        await client.query(
          `SELECT id, status FROM orders WHERE id = (SELECT order_id FROM shipments WHERE id = $1)`,
          [shipmentId],
        )
      ).rows[0];

      // If all shipments in the batch are picked up + delivered, mark order delivered & settle.
      const allDelivered = (
        await client.query(
          `SELECT COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
                  COUNT(*) AS total
             FROM shipments WHERE batch_id = $1`,
          [batchId],
        )
      ).rows[0];

      if (Number(allDelivered.delivered) === Number(allDelivered.total)) {
        // All done; settle this batch.
        await client.query(`UPDATE batches SET status = 'completed', completed_at = now() WHERE id = $1`, [batchId]);

        // Settlement for all shipments in this batch: capture payments, create payouts.
        const shipmentIds = (
          await client.query(`SELECT id, order_id FROM shipments WHERE batch_id = $1`, [batchId])
        ).rows;

        // Single driver earning for the whole batch, split evenly across its
        // orders for per-order settlement records (one combined payout though).
        const m = (
          await client.query(`SELECT est_earnings FROM batch_metrics WHERE batch_id = $1`, [batchId])
        ).rows[0];
        const earning = Number(m?.est_earnings ?? 0);
        const driverSharePerOrder = Math.round((earning / shipmentIds.length) * 100) / 100;

        for (const ss of shipmentIds) {
          await capturePayment(client, this.provider, ss.order_id);

          // Seller payouts (via gateway) + notifications.
          const sellerRows = (
            await client.query(
              `SELECT l.seller_id, sp.upi_id,
                      SUM(oi.qty * oi.payout_price)::numeric(14,2) AS amount
                 FROM order_items oi
                 JOIN listings l ON l.id = oi.listing_id
                 LEFT JOIN seller_profiles sp ON sp.user_id = l.seller_id
                WHERE oi.order_id = $1
                GROUP BY l.seller_id, sp.upi_id`,
              [ss.order_id],
            )
          ).rows;
          let farmerTotal = 0;
          for (const sr of sellerRows) {
            await runPayout(client, this.provider, {
              payeeId: sr.seller_id, payeeType: 'seller', orderId: ss.order_id,
              amount: Number(sr.amount), destination: sr.upi_id,
            });
            farmerTotal += Number(sr.amount);
            await this.notifications.notify(sr.seller_id, 'payout_released', { amount: Number(sr.amount) }, client);
          }

          await recordSettlement(client, ss.order_id, farmerTotal, driverSharePerOrder);

          const buyerId = (await client.query('SELECT buyer_id FROM orders WHERE id = $1', [ss.order_id]))
            .rows[0]?.buyer_id;
          if (buyerId) {
            await this.notifications.notify(buyerId, 'delivered', { orderShort: ss.order_id.slice(0, 8) }, client);
          }
        }

        // One combined driver payout for the whole batch (linked to first order).
        await runPayout(client, this.provider, {
          payeeId: userId, payeeType: 'driver', orderId: shipmentIds[0].order_id, amount: earning,
        });
        await this.notifications.notify(userId, 'driver_earning', { amount: earning }, client);

        // Mark all orders in batch as delivered.
        await client.query(
          `UPDATE orders SET status = 'delivered'
           WHERE id IN (SELECT DISTINCT order_id FROM shipments WHERE batch_id = $1)`,
          [batchId],
        );
      }

      return { shipment_id: shipmentId, batch_id: batchId, status: 'delivered', batch_complete: Number(allDelivered.delivered) === Number(allDelivered.total) };
    });
  }
}