// KANNI design tokens — earthy, high-contrast, large touch targets for
// low-literacy farmers. Keep colors few and meaningful.
export const C = {
  green: '#2e7d32',
  greenD: '#1b5e20',
  greenL: '#e7f4e8',
  bg: '#f5f7f4',
  card: '#ffffff',
  ink: '#1a2419',
  muted: '#6b7a68',
  line: '#e2e8df',
  amber: '#b26a00',
  amberL: '#fff3e0',
  red: '#c62828',
  redL: '#fdecea',
  blue: '#1565c0',
  white: '#ffffff',
};

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  radius: 14,
};

// Status → pill color. Covers listing, order, shipment, payout states.
export function statusColor(status?: string): { bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (['live', 'delivered', 'settled', 'paid', 'captured', 'verified'].includes(s))
    return { bg: C.greenL, fg: C.greenD };
  if (['pending', 'created', 'held', 'assigned', 'pickup_assigned', 'unassigned'].includes(s))
    return { bg: C.amberL, fg: C.amber };
  if (['cancelled', 'rejected', 'refunded', 'failed', 'expired'].includes(s))
    return { bg: C.redL, fg: C.red };
  return { bg: '#eef2ec', fg: C.muted };
}
