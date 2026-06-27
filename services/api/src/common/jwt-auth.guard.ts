import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './roles';

/** Validates the Bearer JWT and attaches the decoded user to request.user. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET });
      req.user = { sub: payload.sub, role: payload.role ?? null } as AuthUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
