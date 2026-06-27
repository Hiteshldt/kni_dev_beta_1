/**
 * Batch consolidation engine: finds compatible nearby orders, bins them by
 * capacity, optimizes the route, and scores feasibility.
 *
 * v1 uses nearest-neighbor greedy routing (cluster pickups, then route drops).
 * In prod (Phase 3) swap for OR-Tools / Mapbox optimization API.
 */
import { distanceKm, toKg, TARIFF } from './logistics';

export interface BatchCandidate {
  shipmentId: string;
  orderId: string;
  weightKg: number;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  distance: number; // to next stop (computed in route)
  pickupCode: string;
  dropOtp: string;
}

export interface RouteStop {
  idx: number;
  shipmentId: string;
  orderId: string;
  type: 'pickup' | 'drop';
  lat: number;
  lng: number;
  code?: string; // pickup_code for pickups, drop_otp for drops
}

export interface BatchPlan {
  shipmentIds: string[];
  routePlan: RouteStop[];
  totalKm: number;
  totalStops: number;
  totalWeight: number;
  utilization: number; // % of capacity
  estEarnings: number;
  feasible: boolean;
  reason?: string;
}

/** Greedy nearest-neighbor route: start at first pickup, visit nearest unvisited pickup,
 * then route all drops by nearest. Returns a flat sequence of stops (pick + drop for each).
 */
function planRoute(candidates: BatchCandidate[]): RouteStop[] {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) {
    // Single shipment: pick then drop.
    const c = candidates[0];
    return [
      { idx: 0, shipmentId: c.shipmentId, orderId: c.orderId, type: 'pickup', lat: c.pickupLat, lng: c.pickupLng, code: c.pickupCode },
      { idx: 1, shipmentId: c.shipmentId, orderId: c.orderId, type: 'drop', lat: c.dropLat, lng: c.dropLng, code: c.dropOtp },
    ];
  }

  // Multi-shipment: nearest-neighbor on pickups, then drops.
  const pickups = candidates.map((c) => ({
    ...c,
    pickupDist: 0,
  }));
  const visited = new Set<string>();
  const route: RouteStop[] = [];
  let currentLat = pickups[0].pickupLat;
  let currentLng = pickups[0].pickupLng;
  visited.add(pickups[0].shipmentId);

  // Add first pickup.
  route.push({
    idx: route.length,
    shipmentId: pickups[0].shipmentId,
    orderId: pickups[0].orderId,
    type: 'pickup',
    lat: currentLat,
    lng: currentLng,
    code: pickups[0].pickupCode,
  });
  currentLat = pickups[0].pickupLat;
  currentLng = pickups[0].pickupLng;

  // Greedily add nearest unvisited pickups.
  while (visited.size < pickups.length) {
    let nearest = -1;
    let minDist = Infinity;
    for (let i = 0; i < pickups.length; i++) {
      if (!visited.has(pickups[i].shipmentId)) {
        const d = distanceKm(currentLat, currentLng, pickups[i].pickupLat, pickups[i].pickupLng);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
    }
    if (nearest >= 0) {
      const c = pickups[nearest];
      visited.add(c.shipmentId);
      route.push({
        idx: route.length,
        shipmentId: c.shipmentId,
        orderId: c.orderId,
        type: 'pickup',
        lat: c.pickupLat,
        lng: c.pickupLng,
        code: c.pickupCode,
      });
      currentLat = c.pickupLat;
      currentLng = c.pickupLng;
    }
  }

  // Route drops: nearest to last pickup position.
  const drops = candidates.map((c) => ({
    ...c,
    dropDist: 0,
  }));
  const visitedDrops = new Set<string>();
  currentLat = route[route.length - 1].lat; // last pickup
  currentLng = route[route.length - 1].lng;

  while (visitedDrops.size < drops.length) {
    let nearest = -1;
    let minDist = Infinity;
    for (let i = 0; i < drops.length; i++) {
      if (!visitedDrops.has(drops[i].shipmentId)) {
        const d = distanceKm(currentLat, currentLng, drops[i].dropLat, drops[i].dropLng);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
    }
    if (nearest >= 0) {
      const c = drops[nearest];
      visitedDrops.add(c.shipmentId);
      route.push({
        idx: route.length,
        shipmentId: c.shipmentId,
        orderId: c.orderId,
        type: 'drop',
        lat: c.dropLat,
        lng: c.dropLng,
        code: c.dropOtp,
      });
      currentLat = c.dropLat;
      currentLng = c.dropLng;
    }
  }

  return route;
}

/** Compute total route distance given a set of candidates and their sequence. */
function routeDistance(route: RouteStop[]): number {
  if (route.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += distanceKm(route[i - 1].lat, route[i - 1].lng, route[i].lat, route[i].lng);
  }
  return Math.round(total * 100) / 100;
}

/** Bin-pack candidates into a single batch, checking capacity + efficiency. */
export function planBatch(
  candidates: BatchCandidate[],
  driverCapacityKg: number,
): BatchPlan {
  if (candidates.length === 0) {
    return { shipmentIds: [], routePlan: [], totalKm: 0, totalStops: 0, totalWeight: 0, utilization: 0, estEarnings: 0, feasible: false, reason: 'No candidates' };
  }

  const totalWeight = candidates.reduce((s, c) => s + c.weightKg, 0);
  if (totalWeight > driverCapacityKg) {
    return {
      shipmentIds: candidates.map((c) => c.shipmentId),
      routePlan: [],
      totalKm: 0,
      totalStops: 0,
      totalWeight,
      utilization: (totalWeight / driverCapacityKg) * 100,
      estEarnings: 0,
      feasible: false,
      reason: `Total weight ${totalWeight}kg exceeds capacity ${driverCapacityKg}kg`,
    };
  }

  const routePlan = planRoute(candidates);
  const totalKm = routeDistance(routePlan);
  const totalStops = candidates.length * 2; // pick + drop per shipment
  const utilization = (totalWeight / driverCapacityKg) * 100;

  // Earnings: base + per_km + per_stop. Batch bonus applied per stop (Phase 2 feature).
  const batchBonus = 10; // extra per stop vs. single trips
  const estEarnings =
    TARIFF.baseFare +
    TARIFF.perKm * totalKm +
    (TARIFF.perStop + batchBonus) * totalStops;

  // Heuristic feasibility: route must finish within 6h + weight + can't be too scattered.
  const estimatedMinutes = totalKm / 15; // assume 15km/h avg in traffic
  const feasible = estimatedMinutes < 360 && utilization >= 30; // also want decent utilization

  return {
    shipmentIds: candidates.map((c) => c.shipmentId),
    routePlan,
    totalKm,
    totalStops,
    totalWeight,
    utilization,
    estEarnings: Math.round(estEarnings * 100) / 100,
    feasible,
    reason: feasible ? undefined : `Route ${estimatedMinutes.toFixed(0)}min, utilization ${utilization.toFixed(0)}%`,
  };
}
