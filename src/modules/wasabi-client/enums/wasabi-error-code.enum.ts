export enum WasabiErrorCode {
  // Auth / Signature
  AuthFailed = 'WASABI_AUTH_FAILED',
  // Holder
  HolderRejected = 'HOLDER_REJECTED',
  HolderNotApproved = 'HOLDER_NOT_APPROVED',
  HolderNotFound = 'HOLDER_NOT_FOUND',
  // Card
  CardRejected = 'CARD_REJECTED',
  CardNotFound = 'CARD_NOT_FOUND',
  CardAlreadyFrozen = 'CARD_ALREADY_FROZEN',
  CardNotFrozen = 'CARD_NOT_FROZEN',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  // HTTP / Network
  RateLimited = 'WASABI_RATE_LIMITED',
  Unavailable = 'WASABI_UNAVAILABLE',
  Timeout = 'WASABI_TIMEOUT',
  UnknownError = 'WASABI_UNKNOWN_ERROR',
}
