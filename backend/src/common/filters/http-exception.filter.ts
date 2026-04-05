import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from 'src/shared/types/api-response.type';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] })?.message ||
          (exception instanceof Error ? exception.message : 'Unexpected error');

    const details = Array.isArray(message) ? message : [message];
    const correlationId = String(request.correlationId || request.headers['x-correlation-id'] || '');

    const logPayload = {
      method: request.method,
      path: request.originalUrl || request.url,
      status,
      correlationId,
      details,
    };

    if (status >= 500) {
      this.logger.error(JSON.stringify(logPayload), exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(JSON.stringify(logPayload));
    }

    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      meta: null,
      error: {
        code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : String(message),
        details,
      },
    };

    response.status(status).json(payload);
  }
}
