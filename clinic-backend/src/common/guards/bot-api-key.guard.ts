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
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-bot-api-key'];
    const expectedKey = this.configService.get<string>('BOT_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('Bot API key is not configured on the server');
    }

    if (apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid Bot API Key');
    }

    return true;
  }
}
