import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export const ApiHealthTag = () => ApiTags('Health');

export const ApiHealthCheck = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Health check',
      description:
        'Returns the current operational status of the service. ' +
        'Use this endpoint for liveness probes in Kubernetes / Docker.',
    }),
    ApiResponse({
      status: 200,
      description: 'Service is running',
      schema: {
        example: {
          status: 'ok',
          service: 'card-proxy',
          timestamp: '2024-03-01T12:00:00.000Z',
        },
      },
    }),
  );
