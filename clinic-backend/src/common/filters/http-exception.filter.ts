import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter to prevent information leakage
 */
@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log error details (but don't expose to client)
    this.logger.error(
      `HTTP ${status} Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
      `${request.method} ${request.url}`,
    );

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    // For 401 Unauthorized, return minimal response
    if (status === HttpStatus.UNAUTHORIZED) {
      const errorMessage =
        typeof message === 'string'
          ? message
          : (message as any)?.message || 'Unauthorized';

      return response.status(status).json({
        statusCode: status,
        message: errorMessage,
      });
    }

    // For other errors, return standard format
    const errorResponse: any = {
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : (message as any)?.message || 'An error occurred',
    };

    // Only add extra details in development
    if (isDevelopment) {
      errorResponse.timestamp = new Date().toISOString();
      errorResponse.path = request.url;
      errorResponse.method = request.method;

      if (typeof message === 'object' && (message as any).error) {
        errorResponse.error = (message as any).error;
      }

      if (exception instanceof Error) {
        errorResponse.stack = exception.stack;
      }
    }

    response.status(status).json(errorResponse);
  }
}
