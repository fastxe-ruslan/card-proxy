import { Logger } from '@nestjs/common';
import {
  WasabiAuthException,
  WasabiException,
  WasabiRateLimitException,
  WasabiTimeoutException,
  WasabiUnavailableException,
  HolderRejectedException,
  HolderNotApprovedException,
  CardRejectedException,
} from './wasabi.errors';
import { WasabiErrorCode } from '../enums/wasabi-error-code.enum';

interface AxiosErrorShape {
  code?: string;
  response?: {
    status?: number;
    headers?: Record<string, string>;
    data?: { code?: string; msg?: string };
  };
}

const logger = new Logger('WasabiErrorMapper');

export function mapWasabiError(
  error: unknown,
  correlationId: string,
  operation: string,
): never {
  if (error === undefined || error === null) {
    logger.error(
      `[${correlationId}] ${operation} failed with no error context`,
    );
    throw new WasabiUnavailableException();
  }

  const err = error as AxiosErrorShape;

  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    logger.warn(`[${correlationId}] ${operation} timed out`);
    throw new WasabiTimeoutException();
  }

  const httpStatus = err.response?.status ?? 0;
  const wasabiCode = err.response?.data?.code ?? '';
  const wasabiMsg = err.response?.data?.msg ?? 'unknown';

  logger.warn(
    `[${correlationId}] ${operation} failed: HTTP ${httpStatus}, wasabi_code=${wasabiCode}, msg=${wasabiMsg}`,
  );

  if (httpStatus === 401 || wasabiCode === '40100' || wasabiCode === '40101') {
    throw new WasabiAuthException({ wasabiCode, wasabiMsg });
  }

  if (httpStatus === 429) {
    const retryAfter = err.response?.headers?.['retry-after'];
    throw new WasabiRateLimitException(
      retryAfter ? Number(retryAfter) * 1000 : undefined,
    );
  }

  if (httpStatus >= 500) {
    throw new WasabiUnavailableException({ wasabiCode, wasabiMsg });
  }

  throw new WasabiException(
    WasabiErrorCode.UnknownError,
    `Wasabi error: ${wasabiMsg}`,
    httpStatus || 502,
    { wasabiCode, wasabiMsg },
  );
}

export function assertHolderApproved(status: string): void {
  if (status === 'reject') throw new HolderRejectedException();
  if (status !== 'pass_audit') throw new HolderNotApprovedException();
}

export function assertCardActive(status: string): void {
  if (status === 'reject') throw new CardRejectedException();
}
