import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object') {
          data = this.transformResponse(data);
        }

        return {
          statusCode: res.statusCode,
          message: 'Success',
          data: data,
        };
      }),
    );
  }

  private transformResponse(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.transformResponse(item));
    }

    if (data && typeof data === 'object' && data !== null) {
      const transformed = {};

      Object.keys(data).forEach((key) => {
        // Exclude sensitive fields
        if (['password', 'salt', 'hashedPassword'].includes(key)) {
          return;
        }

        const value = data[key];

        if (value instanceof Date) {
          transformed[key] = value.toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          transformed[key] = this.transformResponse(value);
        } else if (Array.isArray(value)) {
          transformed[key] = value.map((item) => this.transformResponse(item));
        } else {
          transformed[key] = value;
        }
      });

      return transformed;
    }

    return data;
  }
}
