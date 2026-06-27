import { Controller, Get, Query } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** Public: the produce catalog the seller picks from (visual grid in the app). */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly db: DbService) {}

  @Get()
  async list(@Query('lang') lang = 'ta', @Query('category') category?: string) {
    const rows = await this.db.query(
      `SELECT id, slug, names, category, default_unit, default_moq, perishability_days, image_url
         FROM produce_catalog
        WHERE ($1::text IS NULL OR category = $1)
        ORDER BY category, slug`,
      [category ?? null],
    );
    // Surface the requested language's name for convenience, keep full names map too.
    return rows.map((r) => ({
      ...r,
      name: r.names[lang] ?? r.names.en,
    }));
  }
}
