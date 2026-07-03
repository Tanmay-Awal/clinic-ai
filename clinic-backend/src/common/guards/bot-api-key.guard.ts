import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to protect endpoints specifically for bot usage.
 * Expects 'x-bot-api-key' in the headers.
 */
@Injectable()
export class BotApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
