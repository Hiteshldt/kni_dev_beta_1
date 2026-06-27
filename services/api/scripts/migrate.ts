/**
 * Minimal forward-only migration runner.
 * Applies every services/api/migrations/*.sql not yet recorded in _migrations.
 */
import { Client } from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { pgSsl } from '../src/common/pg';

config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: pgSsl() });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const dir = join(__dirname, '..', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const done = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (done.rowCount) {
      console.log(`= skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations(name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`+ applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`x failed ${file}`);
      throw err;
    }
  }

  await client.end();
  console.log('Migrations complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
