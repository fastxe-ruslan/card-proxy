import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { WasabiSigningService } from './wasabi-signing.service';
import { WasabiCredentialService } from './wasabi-credential.service';
import { WasabiRequestLogEntity } from '../entities/wasabi-request-log.entity';
import { WasabiResponse } from '../interfaces/wasabi-api.types';
import { mapWasabiError } from '../errors/wasabi-error.mapper';
import {
  WasabiRateLimitException,
  WasabiTimeoutException,
  WasabiUnavailableException,
} from '../errors/wasabi.errors';
import { CorrelationService } from '../../../common/correlation/correlation.service';
import { PiiMasker } from '../../../common/utils/pii-masker';

function isRetryable(err: unknown): boolean {
  const e = err as {
    code?: string;
    response?: { status?: number };
  };
  if (
    e.code === 'ECONNRESET' ||
    e.code === 'ETIMEDOUT' ||
    e.code === 'ECONNABORTED'
  ) {
    return true;
  }
  const status = e.response?.status;
  if (status === undefined) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface WasabiRequestOptions {
  programId?: string;
  correlationId?: string;
  timeoutMs?: number;
}

@Injectable()
export class WasabiHttpService {
  private readonly logger = new Logger(WasabiHttpService.name);
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly signingService: WasabiSigningService,
    private readonly credentialService: WasabiCredentialService,
    private readonly correlationService: CorrelationService,
    @InjectRepository(WasabiRequestLogEntity)
    private readonly requestLogRepo: Repository<WasabiRequestLogEntity>,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('WASABI_API_BASE_URL');
    this.defaultTimeout =
      this.configService.get<number>('WASABI_TIMEOUT_MS') ?? 10_000;
    this.maxRetries = this.configService.get<number>('WASABI_MAX_RETRIES') ?? 3;
  }

  async post<TReq extends object, TRes>(
    operation: string,
    endpoint: string,
    body: TReq,
    options: WasabiRequestOptions = {},
  ): Promise<TRes> {
    return this.execute<TRes>(operation, 'POST', endpoint, body, options);
  }

  async postForm<TRes>(
    operation: string,
    endpoint: string,
    formData: FormData,
    options: WasabiRequestOptions = {},
  ): Promise<TRes> {
    return this.executeForm<TRes>(operation, endpoint, formData, options);
  }

  private async execute<TRes>(
    operation: string,
    method: 'POST' | 'GET',
    endpoint: string,
    body: object,
    options: WasabiRequestOptions,
  ): Promise<TRes> {
    const correlationId =
      options.correlationId ?? this.correlationService.get();
    const cred = await this.credentialService.resolve(options.programId);
    const bodyJson = JSON.stringify(body);
    const timeout = options.timeoutMs ?? this.defaultTimeout;
    let lastError: unknown;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      const signHeaders = this.signingService.buildHeaders(
        cred.appId,
        bodyJson,
        cred.privateKeyPem,
      );
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': cred.apiKey,
        'x-correlation-id': correlationId,
        ...signHeaders,
      };

      const startMs = Date.now();
      let statusCode: number | null = null;
      let responsePayload: unknown = null;
      let errorCode: string | null = null;

      try {
        this.logger.debug(
          `[${correlationId}] ${operation} → ${method} ${endpoint} (attempt ${attempt + 1})`,
        );

        const response = await firstValueFrom(
          this.httpService.request<WasabiResponse<TRes>>({
            method,
            baseURL: this.baseUrl,
            url: endpoint,
            data: bodyJson,
            headers,
            timeout,
          }),
        );

        statusCode = response.status;
        responsePayload = response.data;
        const durationMs = Date.now() - startMs;

        await this.saveLog({
          operation,
          endpoint,
          method,
          statusCode,
          durationMs,
          correlationId,
          requestPayload: body,
          responsePayload: response.data,
          success: true,
        });

        return response.data.data;
      } catch (err) {
        const e = err as {
          response?: { status?: number; data?: unknown };
          message?: string;
        };
        statusCode = e.response?.status ?? null;
        responsePayload = e.response?.data ?? null;
        lastError = err;

        const durationMs = Date.now() - startMs;
        errorCode = this.extractErrorCode(err);

        if (statusCode) {
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            this.logger.warn(
              `[${correlationId}] ${operation} HTTP ${statusCode} — no retry`,
            );
            await this.saveLog({
              operation,
              endpoint,
              method,
              statusCode,
              durationMs,
              correlationId,
              requestPayload: body,
              responsePayload,
              errorCode,
            });
            mapWasabiError(err, correlationId, operation);
          }
        }

        if (!isRetryable(err)) {
          await this.saveLog({
            operation,
            endpoint,
            method,
            statusCode,
            durationMs,
            correlationId,
            requestPayload: body,
            responsePayload,
            errorCode,
          });
          mapWasabiError(err, correlationId, operation);
        }

        if (attempt >= this.maxRetries) {
          await this.saveLog({
            operation,
            endpoint,
            method,
            statusCode,
            durationMs,
            correlationId,
            requestPayload: body,
            responsePayload,
            errorCode,
          });
          break;
        }

        const retryAfterMs = this.getRetryAfterMs(err);
        const backoff =
          retryAfterMs ??
          Math.min(1000 * 2 ** attempt + Math.random() * 200, 8000);
        this.logger.warn(
          `[${correlationId}] ${operation} attempt ${attempt + 1} failed (${statusCode ?? 'network'}), ` +
            `retrying in ${Math.round(backoff)}ms…`,
        );
        await sleep(backoff);
        attempt++;
      }
    }

    mapWasabiError(lastError, correlationId, operation);
  }

  private async executeForm<TRes>(
    operation: string,
    endpoint: string,
    formData: FormData,
    options: WasabiRequestOptions,
  ): Promise<TRes> {
    const correlationId =
      options.correlationId ?? this.correlationService.get();
    const cred = await this.credentialService.resolve(options.programId);
    const signHeaders = this.signingService.buildHeaders(
      cred.appId,
      '',
      cred.privateKeyPem,
    );
    const headers: Record<string, string> = {
      'x-api-key': cred.apiKey,
      'x-correlation-id': correlationId,
      ...signHeaders,
    };

    const startMs = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.request<WasabiResponse<TRes>>({
          method: 'POST',
          baseURL: this.baseUrl,
          url: endpoint,
          data: formData,
          headers,
          timeout: options.timeoutMs ?? this.defaultTimeout * 3,
        }),
      );

      await this.saveLog({
        operation,
        endpoint,
        method: 'POST',
        statusCode: response.status,
        durationMs: Date.now() - startMs,
        correlationId,
        requestPayload: { holderId: '[multipart]' },
        responsePayload: response.data,
        success: true,
      });

      return response.data.data;
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown } };
      await this.saveLog({
        operation,
        endpoint,
        method: 'POST',
        statusCode: e.response?.status ?? null,
        durationMs: Date.now() - startMs,
        correlationId,
        requestPayload: { holderId: '[multipart]' },
        responsePayload: e.response?.data ?? null,
        errorCode: this.extractErrorCode(err),
      });
      mapWasabiError(err, correlationId, operation);
    }
  }

  private async saveLog(params: {
    operation: string;
    endpoint: string;
    method: string;
    statusCode: number | null;
    durationMs: number;
    correlationId: string;
    requestPayload: unknown;
    responsePayload: unknown;
    errorCode?: string | null;
    success?: boolean;
  }): Promise<void> {
    try {
      const respData = params.responsePayload as Record<string, unknown> | null;
      const wasabiCode = (respData?.['code'] as string | undefined) ?? null;
      const wasabiMsg = (respData?.['msg'] as string | undefined) ?? null;
      const success =
        params.success ?? (params.statusCode === 200 && wasabiCode === '0');

      await this.requestLogRepo.save(
        this.requestLogRepo.create({
          operation: params.operation,
          endpoint: params.endpoint,
          method: params.method,
          statusCode: params.statusCode,
          durationMs: params.durationMs,
          correlationId: params.correlationId,
          wasabiCode,
          wasabiMsg,
          success,
          requestPayload: PiiMasker.mask(params.requestPayload) as Record<
            string,
            unknown
          >,
          responsePayload: PiiMasker.mask(params.responsePayload) as Record<
            string,
            unknown
          >,
        }),
      );
    } catch (err) {
      this.logger.error('Failed to save wasabi_request_log', err);
    }
  }

  private extractErrorCode(err: unknown): string | null {
    const e = err as { response?: { data?: { code?: string } } };
    return e.response?.data?.code ?? null;
  }

  private getRetryAfterMs(err: unknown): number | undefined {
    if (err instanceof WasabiRateLimitException) return err.retryAfterMs;
    if (err instanceof WasabiUnavailableException) return undefined;
    if (err instanceof WasabiTimeoutException) return undefined;
    const e = err as {
      response?: { headers?: Record<string, string>; status?: number };
    };
    if (e.response?.status === 429) {
      const ra = e.response.headers?.['retry-after'];
      if (ra) return Number(ra) * 1000;
    }
    return undefined;
  }
}
