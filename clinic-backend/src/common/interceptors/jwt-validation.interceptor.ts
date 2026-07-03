import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';

/**
 * Global JWT Validation Interceptor
 * Validates JWT tokens on every request and checks if user exists in database
 * Returns 401 Unauthorized if token is invalid, expired, or user doesn't exist
 */
@Injectable()
export class JwtValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(JwtValidationInterceptor.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip validation for public endpoints
    const publicPaths = [
      '/api/user/login',
      '/api/user/register',
      '/api/health',
      '/api/calls/ingest',
      '/api/appointments/context',
      '/api/appointments/doctors',
      '/api/appointments/slots',
    ];

    // Exact match for root endpoint
    if (request.path === '/api' || request.path === '/api/') {
      return next.handle();
    }

    // Check if path matches public paths exactly
    const isPublicPath = publicPaths.some((path) => request.path === path);

    // Also skip for LiveKit ingest webhook which uses its own guard (LivekitIngestGuard)
    const isLiveKitIngest = request.path === '/api/livekit/ingest';

    if (isPublicPath || isLiveKitIngest) {
      return next.handle();
    }

    // Skip validation if a valid Bot API Key is provided
    const botApiKey = request.headers['x-bot-api-key'];
    if (botApiKey) {
      const expectedBotKey = this.configService.get<string>('BOT_API_KEY');
      if (expectedBotKey && botApiKey === expectedBotKey) {
        // Allow the bot request to proceed
        return next.handle();
      }
    }

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(
        `Missing or invalid Authorization header for ${request.method} ${request.path}`,
      );
      throw new UnauthorizedException(
        'Authentication required. Please provide a valid token.',
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify and decode the JWT token
      const jwtSecret =
        this.configService.get<string>('JWT_SECRET') ||
        'your-secret-key-change-in-production';
      const payload = this.jwtService.verify(token, { secret: jwtSecret });

      // Log token payload for debugging (remove in production if needed)
      this.logger.debug(`JWT payload for ${request.method} ${request.path}:`, {
        sub: payload.sub,
        email: payload.email,
        role_id: payload.role_id || 'not in token',
      });

      // Validate payload structure
      if (!payload.sub || !payload.email) {
        this.logger.warn(
          `Invalid token payload for ${request.method} ${request.path}`,
        );
        throw new UnauthorizedException('Invalid token payload');
      }

      // Check if user exists in database
      const userId = parseInt(payload.sub, 10);
      if (isNaN(userId)) {
        this.logger.warn(`Invalid user ID in token: ${payload.sub}`);
        throw new UnauthorizedException('Invalid user ID in token');
      }

      // Fetch user with role_id from database (always get latest role_id from DB)
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'role', 'role_id'],
      });

      if (!user) {
        this.logger.warn(
          `User not found in database: ${userId} for ${request.method} ${request.path}`,
        );
        throw new UnauthorizedException('User not found. Please login again.');
      }

      // Fetch role name from roles table if role_id exists
      let roleName: string | null = null;
      if (user.role_id) {
        const role = await this.roleRepository.findOne({
          where: { id: user.role_id },
        });
        roleName = role?.name || null;
      }

      // Attach user info to request for use in controllers and interceptors
      // Use role_id from DB (latest value) or fallback to role_id from token, or null
      const roleIdFromToken = payload.role_id || null;
      const roleIdFromDb = user.role_id || null;

      this.logger.debug(
        `User role info for ${request.method} ${request.path}:`,
        {
          userId: user.id,
          role_from_table: roleName,
          role_from_enum: user.role,
          role_id_from_token: roleIdFromToken,
          role_id_from_db: roleIdFromDb,
        },
      );

      request.user = {
        userId: user.id,
        email: user.email,
        role: roleName || user.role || null, // Use role name from table, fallback to enum
        role_id: roleIdFromDb || roleIdFromToken || null, // Prefer DB value, fallback to token
      };

      return next.handle();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle JWT verification errors
      if (error.name === 'JsonWebTokenError') {
        this.logger.warn(
          `Invalid JWT token for ${request.method} ${request.path}: ${error.message}`,
        );
        throw new UnauthorizedException('Invalid token. Please login again.');
      }

      if (error.name === 'TokenExpiredError') {
        this.logger.warn(
          `Expired JWT token for ${request.method} ${request.path}`,
        );
        throw new UnauthorizedException(
          'Token has expired. Please login again.',
        );
      }

      // Handle other errors
      this.logger.error(
        `JWT validation error for ${request.method} ${request.path}:`,
        error,
      );
      throw new UnauthorizedException(
        'Authentication failed. Please login again.',
      );
    }
  }
}
