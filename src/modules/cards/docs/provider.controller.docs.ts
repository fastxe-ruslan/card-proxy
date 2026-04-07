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
      description:
        'Wasabi account assets (same shape as POST /merchant/core/mcb/account/info `data`)',
      schema: {
        example: {
          data: [
            {
              accountId: '19847563867367666',
              accountName: 'wallet9023',
              accountType: 'WALLET',
              currency: 'USD',
              totalBalance: 100,
              availableBalance: 100,
              frozenBalance: 0,
              digital: 2,
            },
          ],
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
