import { Controller, Get } from '@nestjs/common';
import { DbService } from './db/db.service';

@Controller()
export class AppController {
  constructor(private readonly db: DbService) {}

  @Get('health')
  async health() {
    const r = await this.db.one<{ now: string }>('SELECT now()::text AS now');
    return { status: 'ok', service: 'kanni-api', db_time: r?.now };
  }
}
