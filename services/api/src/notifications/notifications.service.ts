import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotifType, render } from './notifications.templates';
import { PoolClient } from 'pg';

type Vars = Record<string, string | number>;

/**
 * Notification fan-out. In dev we render the message in the recipient's
 * preferred language, persist it in-app, and log it (the stand-in for FCM/SMS).
 * Swap `dispatch()` for MSG91 (SMS) + FCM (push) in prod — the call sites and
 * stored records don't change.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger('Notifications');

  constructor(private readonly db: DbService) {}

  /**
   * Send a notification to a user. If `client` is passed, the insert joins the
   * caller's transaction (so notifications commit/rollback with the event).
   */
  async notify(userId: string, type: NotifType, vars: Vars = {}, client?: PoolClient) {
    // Run on the caller's transaction when given a client, else on the pool.
    const run = (sql: string, p: any[]): Promise<any> =>
      client ? client.query(sql, p).then((r) => r.rows[0] ?? null) : this.db.one(sql, p);

    const u = await run('SELECT preferred_lang FROM users WHERE id = $1', [userId]);
    const lang = u?.preferred_lang ?? 'en';
    const { title, body } = render(type, lang, vars);

    const row = await run(
      `INSERT INTO notifications (user_id, type, title, body, lang, payload)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [userId, type, title, body, lang, JSON.stringify(vars)],
    );

    // Dev dispatch: log line. Prod: route to SMS/push by channel + user prefs.
    this.log.log(`→ ${userId.slice(0, 8)} [${type}/${lang}] ${title}: ${body}`);
    return row;
  }

  async list(userId: string, unreadOnly = false) {
    return this.db.query(
      `SELECT id, type, title, body, lang, payload, read_at, created_at
         FROM notifications
        WHERE user_id = $1 ${unreadOnly ? 'AND read_at IS NULL' : ''}
        ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
  }

  async unreadCount(userId: string) {
    const r = await this.db.one<{ n: string }>(
      'SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId],
    );
    return { unread: Number(r?.n ?? 0) };
  }

  async markRead(userId: string, id: string) {
    await this.db.query(
      'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
      [id, userId],
    );
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.db.query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [userId]);
    return { ok: true };
  }
}
