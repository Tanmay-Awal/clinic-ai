import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Set UTC timezone for database storage
 * This ensures all dates are stored in UTC in PostgreSQL
 * Must be set before any imports
 */
process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  // Security: Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding if needed
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Cookie parser for CSRF tokens
  app.use(
    cookieParser(
      configService.get<string>(
        'COOKIE_SECRET',
        'your-cookie-secret-change-in-production',
      ),
    ),
  );

  // Trust proxy (important for rate limiting and IP detection)
  // Note: This is handled by Express automatically when behind a proxy

  // CORS configuration
  const corsOrigin = configService.get<string>('CORS_ORIGINS', '*');
  const origins = corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: origins.length === 1 && origins[0] === '*' ? true : origins,
    methods: configService.get<string>(
      'CORS_METHODS',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    ),
    credentials:
      configService.get<string>('CORS_CREDENTIALS', 'true').toLowerCase() ===
      'true',
    allowedHeaders: configService.get<string>(
      'CORS_ALLOWED_HEADERS',
      'Content-Type, Authorization, X-CSRF-Token',
    ),
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe (using NestJS built-in, custom one is in app.module.ts)
  // Note: Custom ValidationPipe in app.module.ts will override this
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Set to false to allow extra properties (can be strict later)
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages:
        configService.get<string>('NODE_ENV') === 'production',
    }),
  );

  // Request size limit
  app.use((req, res, next) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (
      req.headers['content-length'] &&
      parseInt(req.headers['content-length']) > maxSize
    ) {
      return res.status(413).json({
        statusCode: 413,
        message: 'Request entity too large',
      });
    }
    next();
  });

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(
    `🔒 Security features enabled: Helmet, Rate Limiting, CSRF Protection, Input Validation`,
  );
}
bootstrap();
