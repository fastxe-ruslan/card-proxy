import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const AuthRequired = () => ApiBearerAuth();
const UnauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Missing or invalid Bearer token',
});
const ForbiddenResponse = ApiResponse({
  status: 403,
  description: 'Card does not belong to current user',
});
const NotFoundResponse = ApiResponse({
  status: 404,
  description: 'Card not found',
});

export const ApiCardsTag = () => ApiTags('Cards');

export const ApiApplyCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Apply for a card',
      description:
        'Issues a card for an **approved** holder. ' +
        'Business rule: holder must have `status: approved` (Wasabi `pass_audit`). ' +
        'Only one active card per type (virtual/physical) per holder is allowed.',
    }),
    ApiResponse({ status: 201, description: 'Card issued' }),
    ApiResponse({
      status: 400,
      description: 'HOLDER_NOT_APPROVED — holder status is not pass_audit',
      schema: {
        example: {
          errorCode: 'HOLDER_NOT_APPROVED',
          holderStatus: 'wait_audit',
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Active card of this type already exists',
    }),
    UnauthorizedResponse,
  );

export const ApiActivateCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Activate physical card',
      description:
        'Activates a physical card and sets the initial PIN. PIN is never logged.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 201, description: 'Card activated' }),
    ApiResponse({
      status: 400,
      description: 'Invalid PIN format or card not in activatable status',
    }),
    ApiResponse({ status: 409, description: 'Card is already active' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiGetCardDetails = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Get card details',
      description:
        'Returns card info from local DB. ' +
        'Pass `includeSensitive=true` to also fetch PAN, CVV, expiry from Wasabi. ' +
        '**Sensitive data is never stored in DB or logs.**',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'includeSensitive',
      required: false,
      type: 'boolean',
      default: false,
    }),
    ApiResponse({ status: 200, description: 'Card details' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiGetCardBalance = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Get live card balance',
      description: 'Always fetches from Wasabi — not cached.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      schema: { example: { data: { balance: '250.00', currency: 'USD' } } },
    }),
    ApiResponse({ status: 400, description: 'Card is closed or suspended' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiFreezeCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Freeze card',
      description:
        'Temporarily blocks the card. Only allowed when card is `active`.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 201, description: 'Card frozen' }),
    ApiResponse({ status: 400, description: 'Card not in active status' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiUnfreezeCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Unfreeze card',
      description:
        'Restores a frozen card. Only allowed when card is `frozen`.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 201, description: 'Card unfrozen' }),
    ApiResponse({ status: 400, description: 'Card not in frozen status' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiLockCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Lock card',
      description:
        'Hard-locks the card (active or frozen → locked). Requires unlock to restore.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 201, description: 'Card locked' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiUnlockCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Unlock card',
      description: 'Unlocks a locked card.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 201, description: 'Card unlocked' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiTopupCard = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Top up card balance',
      description:
        'Deposits funds. Amount is truncated (not rounded) to 2 decimal places. Only active cards.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', example: 50.0 },
          currency: { type: 'string', default: 'USD' },
        },
      },
    }),
    ApiResponse({ status: 201, description: 'Top-up transaction created' }),
    ApiResponse({ status: 400, description: 'Amount ≤ 0 or card not active' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiGetCardTransactions = () =>
  applyDecorators(
    AuthRequired(),
    ApiOperation({
      summary: 'Get card transactions',
      description:
        'Fetches transactions from Wasabi, upserts locally, returns paginated result. Default: last 30 days.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiQuery({ name: 'page', required: false, type: 'integer', example: 1 }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: 'integer',
      example: 20,
      description: 'Max 100',
    }),
    ApiQuery({
      name: 'startDate',
      required: false,
      type: 'string',
      example: '2024-01-01',
    }),
    ApiQuery({
      name: 'endDate',
      required: false,
      type: 'string',
      example: '2024-12-31',
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated transactions with meta',
    }),
    ApiResponse({ status: 400, description: 'Invalid date format' }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );

export const ApiSetPin = () =>
  applyDecorators(
    AuthRequired(),
    HttpCode(HttpStatus.NO_CONTENT),
    ApiOperation({
      summary: 'Set / change card PIN',
      description:
        '**PCI-sensitive.** PIN is never stored in DB, never logged, never included in audit payload.',
    }),
    ApiParam({ name: 'cardId', type: 'string', format: 'uuid' }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['pin'],
        properties: {
          pin: {
            type: 'string',
            minLength: 4,
            maxLength: 6,
            example: '1234',
            description: 'Digits only',
          },
        },
      },
    }),
    ApiResponse({ status: 204, description: 'PIN updated' }),
    ApiResponse({
      status: 400,
      description: 'Invalid PIN format or card not active',
    }),
    ForbiddenResponse,
    NotFoundResponse,
    UnauthorizedResponse,
  );
