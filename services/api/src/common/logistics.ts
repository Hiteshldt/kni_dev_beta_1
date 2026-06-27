/**
 * Logistics primitives shared by payments (shipment creation) and the driver
 * module (job matching + earnings). Tariffs are config-able; in prod move these
 * to the admin "logistics/zones" config (ENGINEERING_PLAN E-epic).
 */

export const TARIFF = {
  baseFare: 40, // ₹ per trip
  perKm: 12, // ₹ per km
  perStop: 15, // ₹ per pickup/drop stop
  batchBonusPerStop: 10, // applied in Phase 2 batching only
};

/** Great-circle distance in km between two lat/lng points (haversine). */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.min(1, Math.sqrt(a))) * 100) / 100;
}

/** Rough kg-equivalent of a quantity in a given unit (for capacity matching). */
export function toKg(qty: number, unit: string): number {
  switch (unit) {
    case 'kg':
      return qty;
    case 'quintal':
      return qty * 100;
    case 'crate':
      return qty * 20; // assume ~20kg per crate
    case 'dozen':
      return qty * 2; // coarse; refine per produce later
    default:
      return qty;
  }
}

/** Driver earnings for a direct (single-stop pickup→drop) trip. */
export function directEarnings(distance: number, stops = 2): number {
  const e = TARIFF.baseFare + TARIFF.perKm * distance + TARIFF.perStop * stops;
  return Math.round(e * 100) / 100;
}
