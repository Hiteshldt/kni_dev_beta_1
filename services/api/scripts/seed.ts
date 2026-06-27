/**
 * Seeds the produce catalog with vernacular (en/ta/ml) names.
 * Idempotent: upserts on slug.
 */
import { Client } from 'pg';
import { config } from 'dotenv';
import { pgSsl } from '../src/common/pg';

config();

type Item = {
  slug: string;
  names: { en: string; ta: string; ml: string };
  category: 'veg' | 'fruit' | 'grain' | 'other';
  unit?: 'kg' | 'quintal' | 'crate' | 'dozen';
  moq?: number;
  perish?: number;
};

const CATALOG: Item[] = [
  { slug: 'tomato',   names: { en: 'Tomato',   ta: 'தக்காளி',   ml: 'തക്കാളി' },   category: 'veg',   moq: 50, perish: 4 },
  { slug: 'onion',    names: { en: 'Onion',    ta: 'வெங்காயம்', ml: 'സവാള' },      category: 'veg',   moq: 50, perish: 30 },
  { slug: 'potato',   names: { en: 'Potato',   ta: 'உருளைக்கிழங்கு', ml: 'ഉരുളക്കിഴങ്ങ്' }, category: 'veg', moq: 50, perish: 30 },
  { slug: 'brinjal',  names: { en: 'Brinjal',  ta: 'கத்தரிக்காய்', ml: 'വഴുതന' },  category: 'veg',   moq: 30, perish: 5 },
  { slug: 'okra',     names: { en: 'Okra',     ta: 'வெண்டைக்காய்', ml: 'വെണ്ട' },  category: 'veg',   moq: 30, perish: 4 },
  { slug: 'greens',   names: { en: 'Greens',   ta: 'கீரை',      ml: 'ചീര' },        category: 'veg',   moq: 20, perish: 2 },
  { slug: 'chilli',   names: { en: 'Green Chilli', ta: 'பச்சை மிளகாய்', ml: 'പച്ചമുളക്' }, category: 'veg', moq: 20, perish: 6 },
  { slug: 'carrot',   names: { en: 'Carrot',   ta: 'கேரட்',     ml: 'കാരറ്റ്' },    category: 'veg',   moq: 30, perish: 14 },
  { slug: 'cabbage',  names: { en: 'Cabbage',  ta: 'முட்டைகோஸ்', ml: 'കാബേജ്' },    category: 'veg',   moq: 40, perish: 10 },
  { slug: 'banana',   names: { en: 'Banana',   ta: 'வாழைப்பழம்', ml: 'വാഴപ്പഴം' },  category: 'fruit', unit: 'dozen', moq: 20, perish: 5 },
  { slug: 'mango',    names: { en: 'Mango',    ta: 'மாம்பழம்',   ml: 'മാങ്ങ' },     category: 'fruit', moq: 30, perish: 6 },
  { slug: 'coconut',  names: { en: 'Coconut',  ta: 'தேங்காய்',   ml: 'തേങ്ങ' },     category: 'fruit', unit: 'dozen', moq: 10, perish: 30 },
  { slug: 'lemon',    names: { en: 'Lemon',    ta: 'எலுமிச்சை',  ml: 'നാരങ്ങ' },    category: 'fruit', moq: 20, perish: 14 },
  { slug: 'papaya',   names: { en: 'Papaya',   ta: 'பப்பாளி',    ml: 'പപ്പായ' },    category: 'fruit', moq: 30, perish: 6 },
  { slug: 'rice-paddy', names: { en: 'Paddy (Rice)', ta: 'நெல்', ml: 'നെല്ല്' },    category: 'grain', unit: 'quintal', moq: 5, perish: 180 },
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: pgSsl() });
  await client.connect();

  for (const it of CATALOG) {
    await client.query(
      `INSERT INTO produce_catalog (slug, names, category, default_unit, default_moq, perishability_days)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         names = EXCLUDED.names,
         category = EXCLUDED.category,
         default_unit = EXCLUDED.default_unit,
         default_moq = EXCLUDED.default_moq,
         perishability_days = EXCLUDED.perishability_days`,
      [it.slug, JSON.stringify(it.names), it.category, it.unit ?? 'kg', it.moq ?? 10, it.perish ?? 3],
    );
  }

  const { rows } = await client.query('SELECT count(*)::int AS n FROM produce_catalog');
  console.log(`Seeded produce_catalog: ${rows[0].n} items.`);

  // Bootstrap an internal admin account (admin role can't be set via the API).
  const adminPhone = process.env.ADMIN_PHONE ?? '+910000000000';
  await client.query(
    `INSERT INTO users (phone, role) VALUES ($1, 'admin')
     ON CONFLICT (phone) DO UPDATE SET role = 'admin'`,
    [adminPhone],
  );
  console.log(`Admin account ready: ${adminPhone} (login via OTP).`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
