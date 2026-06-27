import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { Role } from '../common/roles';

@Injectable()
export class AuthService {
  private readonly log = new Logger('AuthService');

  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
  ) {}

  /** Generate + store a 6-digit OTP. In dev we return/log it; in prod send via SMS. */
  async requestOtp(phone: string): Promise<{ sent: true; devCode?: string }> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const ttl = Number(process.env.OTP_TTL_SECONDS ?? 300);
    await this.db.query(
      `INSERT INTO otp_codes (phone, code, expires_at, attempts)
       VALUES ($1, $2, now() + ($3 || ' seconds')::interval, 0)
       ON CONFLICT (phone) DO UPDATE SET
         code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0`,
      [phone, code, ttl],
    );

    if ((process.env.OTP_PROVIDER ?? 'dev') === 'dev') {
      this.log.log(`DEV OTP for ${phone}: ${code}`);
      return { sent: true, devCode: code };
    }
    // TODO(prod): integrate MSG91 send here (ENGINEERING_PLAN B1).
    return { sent: true };
  }

  /** Verify OTP, upsert the user, and issue a JWT. Role may be null for new users. */
  async verifyOtp(phone: string, code: string) {
    const row = await this.db.one<{ code: string; expired: boolean; attempts: number }>(
      `SELECT code, (expires_at < now()) AS expired, attempts FROM otp_codes WHERE phone = $1`,
      [phone],
    );
    if (!row) throw new BadRequestException('Request an OTP first');
    if (row.expired) throw new BadRequestException('OTP expired, request a new one');
    if (row.attempts >= 5) throw new BadRequestException('Too many attempts, request a new OTP');

    if (row.code !== code) {
      await this.db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1', [phone]);
      throw new BadRequestException('Incorrect code');
    }

    const user = await this.db.one<{ id: string; role: Role | null }>(
      `INSERT INTO users (phone) VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, role`,
      [phone],
    );
    if (!user) throw new BadRequestException('Could not create or fetch the account');
    await this.db.query('DELETE FROM otp_codes WHERE phone = $1', [phone]);

    return {
      token: await this.signToken(user.id, user.role),
      role: user.role,
      isNewUser: user.role === null,
    };
  }

  /** Set the role on first signup (cannot be changed once set). */
  async setRole(userId: string, role: Role) {
    if (role === 'admin') {
      throw new BadRequestException('Admin accounts are provisioned internally');
    }
    const existing = await this.db.one<{ role: Role | null }>(
      'SELECT role FROM users WHERE id = $1',
      [userId],
    );
    if (existing?.role) {
      throw new BadRequestException('Role already set');
    }
    await this.db.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    return { token: await this.signToken(userId, role), role };
  }

  private async signToken(sub: string, role: Role | null) {
    return this.jwt.signAsync(
      { sub, role },
      { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN ?? '30d' },
    );
  }
}
