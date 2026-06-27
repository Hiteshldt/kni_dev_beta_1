import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './roles';

/** Injects the authenticated user (set by JwtAuthGuard) into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
