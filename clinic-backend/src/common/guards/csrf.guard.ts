import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection Guard
 * Validates CSRF tokens for state-changing requests
 * Uses double-submit cookie pattern (more secure than csurf)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Skip CSRF for public endpoints (login, register)
    const publicPaths = ['/api/user/login', '/api/user/register'];
    if (publicPaths.some((path) => request.path.startsWith(path))) {
      return true;
    }

    // Skip CSRF for API requests authenticated via JWT (Bearer token)
    // as they rely on explicit headers rather than implicit cookies
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }

    // Get CSRF token from header or body
    const token = request.headers['x-csrf-token'] || request.body?._csrf;
    const cookieToken = request.cookies?.['XSRF-TOKEN'];

    if (!token || !cookieToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Validate tokens match (double-submit cookie pattern)
    if (token !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    // Validate token format (should be base64-like)
    if (!this.isValidTokenFormat(token)) {
      throw new ForbiddenException('Invalid CSRF token format');
    }

    return true;
  }

  private isValidTokenFormat(token: string): boolean {
    // CSRF tokens should be base64-like strings
    return /^[A-Za-z0-9+/=_-]{32,}$/.test(token);
  }
}
