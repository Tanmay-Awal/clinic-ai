import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Token Interceptor
 * Generates and sets CSRF tokens in cookies and response headers
 */
@Injectable()
export class CsrfTokenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate CSRF token if not present
    let csrfToken = request.cookies?.['XSRF-TOKEN'];

    if (!csrfToken) {
      csrfToken = crypto.randomBytes(32).toString('base64');
      // Set cookie (httpOnly: false so JavaScript can read it)
      response.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // Must be readable by JavaScript for double-submit pattern
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    // Add CSRF token to response headers
    response.setHeader('X-CSRF-Token', csrfToken);

    return next.handle().pipe(
      map((data) => {
        // Add CSRF token to response body for easy access
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return {
            ...data,
            _csrf: csrfToken,
          };
        }
        return data;
      }),
    );
  }
}
