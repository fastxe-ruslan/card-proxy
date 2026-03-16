import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

export const ApiProviderTag = () => ApiTags('Provider');

export const ApiGetProviderBalance = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get provider (merchant) account balance',
      description:
        '**Admin / internal only.** Returns the current balance of the Wasabi merchant account. ' +
        'Requires JWT with `role: admin` or `role: internal`.',
    }),
    ApiResponse({
      status: 200,
      description: 'Provider balance by currency',
      schema: {
        example: {
          data: {
            programId: 'PROG-001',
            currency: 'USD',
            availableBalance: '10000.00',
            totalBalance: '10500.00',
            frozenBalance: '500.00',
          },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Insufficient permissions — admin role required',
    }),
    ApiResponse({
      status: 401,
      description: 'Missing or invalid Bearer token',
    }),
  );
