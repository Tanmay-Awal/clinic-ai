import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to prevent access to endpoints in production environment
 * Used to disable registration endpoint in production
 */
@Injectable()
export class ProductionGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      throw new ForbiddenException(
        'This endpoint is not available in production',
      );
    }

    return true;
  }
}
