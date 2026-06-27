import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, AuthUser } from './roles';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Enforces @Roles(...) on a handler. Use together with JwtAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !user.role || !required.includes(user.role)) {
      throw new ForbiddenException(`Requires role: ${required.join(' | ')}`);
    }
    return true;
  }
}
