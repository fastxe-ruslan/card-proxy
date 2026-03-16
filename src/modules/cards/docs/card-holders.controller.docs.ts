import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const UnauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Missing or invalid Bearer token',
});
const ForbiddenResponse = ApiResponse({
  status: 403,
  description: 'Access denied — not the owner',
});

export const ApiCardHoldersTag = () => ApiTags('Cardholders');

export const ApiCreatePersonalHolder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create / update personal KYC holder',
      description:
        'Idempotent. If the holder already exists and is `approved` — returns cached result without calling Wasabi. ' +
        'If holder exists but is not approved — calls Wasabi **update** endpoint. ' +
        'Use `version: v2` to include additional KYC fields (occupation, annualSalary, etc.).',
    }),
    ApiResponse({
      status: 201,
      description: 'Holder created or updated',
      schema: { example: { data: { id: 'uuid', status: 'wait_audit' } } },
    }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    UnauthorizedResponse,
  );

export const ApiCreateBusinessHolder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create / update business KYC holder',
      description:
        'Idempotent. Same logic as personal, but uses the business holder model.',
    }),
    ApiResponse({
      status: 201,
      description: 'Business holder created or updated',
    }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    UnauthorizedResponse,
  );

export const ApiGetHolderStatus = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get holder status',
      description:
        'Returns the current KYC status from the local DB. ' +
        'Pass `refresh=true` to re-query Wasabi and update the local record.',
    }),
    ApiParam({ name: 'holderId', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'refresh',
      required: false,
      type: 'boolean',
      description: 'Force Wasabi re-query',
    }),
    ApiResponse({
      status: 200,
      schema: {
        example: { data: { status: 'wait_audit', statusReason: null } },
      },
    }),
    ApiResponse({ status: 404, description: 'Holder not found' }),
    ForbiddenResponse,
    UnauthorizedResponse,
  );

export const ApiUploadDocuments = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Upload KYC documents',
      description:
        'Upload base64-encoded identity documents for the holder. ' +
        'Supported formats: **JPEG, PNG, PDF** (validated by magic bytes, not extension). ' +
        'Max file size: **5 MB** per document. ' +
        'Partial upload is supported — each file result is returned individually.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['holderId'],
        properties: {
          holderId: { type: 'string', format: 'uuid' },
          frontDocument: {
            type: 'string',
            description: 'Base64-encoded front of ID',
          },
          backDocument: {
            type: 'string',
            description: 'Base64-encoded back of ID',
          },
          selfie: {
            type: 'string',
            description: 'Base64-encoded selfie with document',
          },
          signature: {
            type: 'string',
            description: 'Base64-encoded signature (optional)',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Upload results per document',
      schema: {
        example: {
          data: [
            { field: 'frontDocument', fileId: 'FILE-001', success: true },
            {
              field: 'selfie',
              success: false,
              error: 'Wasabi: file too blurry',
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid file format or size, or no documents provided',
    }),
    UnauthorizedResponse,
  );
