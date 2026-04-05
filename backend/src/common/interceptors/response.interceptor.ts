import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_RESPONSE_WRAP_KEY } from 'src/common/decorators/skip-response-wrap.decorator';
import { ApiResponse } from 'src/shared/types/api-response.type';

interface SuccessPayload<T> {
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const skipWrap = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipWrap) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
          return payload as ApiResponse<T>;
        }

        const normalized = payload as SuccessPayload<T>;
        return {
          success: true,
          data: normalized?.data ?? (payload as T),
          meta: normalized?.meta ?? null,
          error: null,
        };
      }),
    );
  }
}
