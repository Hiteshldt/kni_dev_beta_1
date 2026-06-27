/**
 * SSL option for node-postgres. Managed Postgres (Neon, Render, RDS, …) requires
 * TLS; the local dev cluster (trust auth on a unix socket) does not. We enable
 * SSL when the connection string asks for it (`sslmode=require`) or PGSSL=true.
 * `rejectUnauthorized: false` accepts the provider's cert without bundling a CA —
 * fine for these trusted managed hosts.
 */
export function pgSsl(url = process.env.DATABASE_URL || ''): false | { rejectUnauthorized: boolean } {
  const needs = /sslmode=require/i.test(url) || process.env.PGSSL === 'true';
  return needs ? { rejectUnauthorized: false } : false;
}
