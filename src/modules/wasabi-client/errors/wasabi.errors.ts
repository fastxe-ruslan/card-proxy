import { HttpException, HttpStatus } from '@nestjs/common';
import { WasabiErrorCode } from '../enums/wasabi-error-code.enum';

export class WasabiException extends HttpException {
  constructor(
    public readonly errorCode: WasabiErrorCode,
    message: string,
    httpStatus: number,
    public readonly details?: unknown,
  ) {
    super({ errorCode, message, details: details ?? null }, httpStatus);
  }
}

export class WasabiAuthException extends WasabiException {
  constructor(details?: unknown) {
    super(
      WasabiErrorCode.AuthFailed,
      'Wasabi authentication failed',
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }
}

export class WasabiRateLimitException extends WasabiException {
  constructor(public readonly retryAfterMs?: number) {
    super(
      WasabiErrorCode.RateLimited,
      'Wasabi rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class WasabiUnavailableException extends WasabiException {
  constructor(details?: unknown) {
    super(
      WasabiErrorCode.Unavailable,
      'Wasabi service unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }
}

export class WasabiTimeoutException extends WasabiException {
  constructor() {
    super(
      WasabiErrorCode.Timeout,
      'Wasabi request timed out',
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}

export class HolderRejectedException extends WasabiException {
  constructor() {
    super(
      WasabiErrorCode.HolderRejected,
      'Holder has been rejected',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class HolderNotApprovedException extends WasabiException {
  constructor() {
    super(
      WasabiErrorCode.HolderNotApproved,
      'Holder is not yet approved',
      HttpStatus.CONFLICT,
    );
  }
}

export class CardRejectedException extends WasabiException {
  constructor() {
    super(
      WasabiErrorCode.CardRejected,
      'Card has been rejected',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
