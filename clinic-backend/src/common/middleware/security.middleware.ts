import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware to add additional security headers and validations
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    // Prevent clickjacking
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    // Validate request size (basic check)
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      this.logger.warn(
        `Request too large: ${contentLength} bytes from ${req.ip}`,
      );
      return res.status(413).json({
        statusCode: 413,
        message: 'Request entity too large',
      });
    }

    // Log suspicious requests
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /burp/i,
      /w3af/i,
      /sqlmap/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      this.logger.warn(
        `Suspicious user agent detected: ${userAgent} from ${req.ip}`,
      );
    }

    // Rate limiting headers (informational)
    const limit = this.configService.get<string>(
      'RATE_LIMIT_MAX_REQUESTS',
      '50',
    );
    res.setHeader('X-RateLimit-Limit', limit);
    // res.setHeader('X-RateLimit-Remaining', '49'); // Removing misleading remaining count

    next();
  }
}
