import { Controller, Get, Query } from '@nestjs/common';
import { DbService } from '../db/db.service';

/** Public: the produce catalog the seller picks from (visual grid in the app). */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly db: DbService) {}

  @Get()
  async list(
    @Query('lang') lang = 'ta',
    @Query('category') category?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const rows = await this.db.query(
      `SELECT id, slug, names, category, category_id, default_unit, default_moq, perishability_days, image_url
         FROM produce_catalog
        WHERE active = true
          AND ($1::text IS NULL OR category = $1)
          AND ($2::uuid IS NULL OR category_id = $2)
        ORDER BY slug`,
      [category ?? null, categoryId ?? null],
    );
    return rows.map((r) => ({ ...r, name: r.names[lang] ?? r.names.en }));
  }

  /** Public: admin-managed categories (visual grid grouping in the app). */
  @Get('categories')
  async categories(@Query('lang') lang = 'ta') {
    const rows = await this.db.query(
      `SELECT id, slug, name, image_url, sort_order
         FROM categories WHERE active = true ORDER BY sort_order, created_at`,
    );
    return rows.map((r) => ({ ...r, label: r.name[lang] ?? r.name.en }));
  }
}
