import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CorrelationService } from '../correlation/correlation.service';
import { WasabiException } from '../../modules/wasabi-client/errors/wasabi.errors';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
    fields?: Record<string, string[]>;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly correlationService: CorrelationService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const correlationId = this.correlationService.get();
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let body: ErrorBody;

    if (exception instanceof BadRequestException) {
      const raw = exception.getResponse() as { message?: string | string[] };
      const messages = Array.isArray(raw.message)
        ? raw.message
        : [raw.message ?? 'Bad request'];
      const fields: Record<string, string[]> = {};
      for (const msg of messages) {
        const field =
          typeof msg === 'string' ? (msg.split(' ')[0] ?? 'field') : 'field';
        (fields[field] ??= []).push(
          typeof msg === 'string' ? msg : 'Invalid value',
        );
      }
      statusCode = HttpStatus.BAD_REQUEST;
      body = this.make(
        'VALIDATION_ERROR',
        'Validation failed',
        correlationId,
        timestamp,
        fields,
      );
    } else if (exception instanceof UnauthorizedException) {
      statusCode = HttpStatus.UNAUTHORIZED;
      body = this.make(
        'UNAUTHORIZED',
        'Authentication required',
        correlationId,
        timestamp,
      );
    } else if (exception instanceof ForbiddenException) {
      statusCode = HttpStatus.FORBIDDEN;
      body = this.make(
        'FORBIDDEN',
        'Insufficient permissions',
        correlationId,
        timestamp,
      );
    } else if (exception instanceof NotFoundException) {
      statusCode = HttpStatus.NOT_FOUND;
      body = this.make(
        'NOT_FOUND',
        (exception.getResponse() as { message?: string }).message ??
          'Resource not found',
        correlationId,
        timestamp,
      );
    } else if (exception instanceof WasabiException) {
      statusCode = exception.getStatus();
      const resp = exception.getResponse() as {
        errorCode?: string;
        message?: string;
      };
      body = this.make(
        resp.errorCode ?? 'WASABI_ERROR',
        resp.message ?? exception.message,
        correlationId,
        timestamp,
      );
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string }).message ?? 'Request failed');
      body = this.make('HTTP_ERROR', message, correlationId, timestamp);
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      body = this.make(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        correlationId,
        timestamp,
      );
      this.logger.error({
        msg: 'Unhandled exception',
        path: req.url,
        method: req.method,
        correlationId,
        err: exception,
      });
    }

    if (statusCode >= 400 && statusCode < 500) {
      this.logger.warn({
        msg: 'Client error',
        statusCode,
        path: req.url,
        method: req.method,
        code: body.error.code,
        correlationId,
      });
    }

    res.status(statusCode).json(body);
  }

  private make(
    code: string,
    message: string,
    correlationId: string,
    timestamp: string,
    fields?: Record<string, string[]>,
  ): ErrorBody {
    return {
      error: {
        code,
        message,
        correlationId,
        timestamp,
        ...(fields ? { fields } : {}),
      },
    };
  }
}
