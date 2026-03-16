import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const TransactionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
    externalTransactionId: { type: 'string', example: 'TXN-00789' },
    externalCardId: { type: 'string', example: 'CARD-00123' },
    amount: { type: 'string', example: '49.99' },
    currency: { type: 'string', example: 'USD', nullable: true },
    status: {
      type: 'string',
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      example: 'completed',
    },
    description: { type: 'string', example: 'Amazon.com', nullable: true },
    postedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const UnauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Missing or invalid Bearer token',
  schema: {
    example: { statusCode: 401, message: 'Unauthorized' },
  },
});

export const ApiTransactionsTag = () => ApiTags('Transactions');

export const ApiListLocalTransactions = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List transactions (local cache)',
      description:
        'Returns all transactions stored in the local database, ordered by `postedAt` descending. ' +
        'These are synced from Wasabi either via webhooks or the `/sync` endpoint. ' +
        'Use this for fast reads without hitting the Wasabi API.',
    }),
    ApiResponse({
      status: 200,
      description: 'Array of transactions',
      schema: {
        type: 'array',
        items: TransactionSchema,
      },
    }),
    UnauthorizedResponse,
  );

export const ApiSyncTransactions = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Sync transactions from Wasabi',
      description:
        'Fetches the latest auth transactions from the Wasabi API (up to 100 records) ' +
        'and upserts them into the local database. ' +
        'Optionally filter by `cardId` to sync only transactions for a specific card.',
    }),
    ApiQuery({
      name: 'cardId',
      required: false,
      description: 'Filter transactions for a specific card',
      example: 'CARD-00123',
    }),
    ApiResponse({
      status: 201,
      description: 'Transactions synced — returns updated local list',
      schema: {
        type: 'array',
        items: TransactionSchema,
      },
    }),
    ApiResponse({
      status: 503,
      description: 'Wasabi API unavailable',
      schema: {
        example: {
          statusCode: 503,
          errorCode: 'WASABI_UNAVAILABLE',
          message: 'Wasabi service unavailable',
        },
      },
    }),
    UnauthorizedResponse,
  );
