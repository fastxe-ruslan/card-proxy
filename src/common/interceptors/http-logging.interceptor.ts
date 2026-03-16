import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CorrelationService } from '../correlation/correlation.service';

const SKIP_PATHS = new Set([
  '/api/v1/health/live',
  '/api/v1/health/ready',
  '/api/v1/metrics',
]);
const SKIP_WEBHOOK_PATH = '/api/v1/webhooks/wasabi';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly correlationService: CorrelationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { sub?: string } }>();
    const res = http.getResponse<Response>();

    const { method, path } = req;
    if (SKIP_PATHS.has(path) || path === SKIP_WEBHOOK_PATH) {
      return next.handle();
    }

    const correlationId = this.correlationService.get();
    const startMs = Date.now();
    const userId = req.user?.sub;

    this.logger.log({
      msg: 'HTTP request',
      method,
      path,
      correlationId,
      userId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startMs;
          const statusCode = res.statusCode;
          const level =
            statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
          this.logger[level]({
            msg: 'HTTP response',
            method,
            path,
            statusCode,
            durationMs,
            correlationId,
            userId,
          });
        },
        error: (err: { status?: number; message?: string }) => {
          const durationMs = Date.now() - startMs;
          const statusCode = err?.status ?? 500;
          const level = statusCode >= 500 ? 'error' : 'warn';
          this.logger[level]({
            msg: 'HTTP error',
            method,
            path,
            statusCode,
            durationMs,
            correlationId,
            userId,
            error: err?.message,
          });
        },
      }),
    );
  }
}
