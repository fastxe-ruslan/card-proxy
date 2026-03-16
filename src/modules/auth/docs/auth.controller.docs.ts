import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const TokenPairSchema = {
  schema: {
    type: 'object',
    properties: {
      accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5c...' },
      refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5c...' },
    },
  },
};

const AuthResultSchema = {
  schema: {
    type: 'object',
    properties: {
      accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5c...' },
      refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5c...' },
      user: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-...' },
          email: { type: 'string', example: 'user@example.com' },
          status: {
            type: 'string',
            enum: ['unverified', 'active', 'suspended', 'deleted'],
          },
        },
      },
    },
  },
};

const UnauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Invalid credentials or token',
  schema: {
    example: {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    },
  },
});

const TooManyRequestsResponse = ApiResponse({
  status: 429,
  description: 'Too many requests — rate limit exceeded',
  schema: {
    example: {
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    },
  },
});

export const ApiAuthTag = () => ApiTags('Auth');

export const ApiRegisterEmail = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register with email & password',
      description:
        'Creates a new user account and sends a verification email. ' +
        'The account is inactive until the email is confirmed. ' +
        '**Rate limit:** 3 requests / hour.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'Secret1234',
            description:
              'Min 8 chars, at least one uppercase letter and one digit',
          },
          name: { type: 'string', example: 'John Doe', nullable: true },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'User registered — verification email sent',
      schema: {
        example: { message: 'Verification email sent', userId: 'a1b2c3d4-...' },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Email is already registered',
      schema: {
        example: { statusCode: 409, message: 'Email is already registered' },
      },
    }),
    TooManyRequestsResponse,
  );

export const ApiLoginEmail = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Login with email & password',
      description:
        'Returns an access token + refresh token pair. ' +
        'Requires the email to be verified first. ' +
        '**Rate limit:** 5 requests / 15 min.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          password: { type: 'string', example: 'Secret1234' },
        },
      },
    }),
    HttpCode(HttpStatus.OK),
    ApiResponse({
      status: 200,
      description: 'Authenticated',
      ...AuthResultSchema,
    }),
    ApiResponse({
      status: 403,
      description: 'Email not yet verified',
      schema: { example: { statusCode: 403, message: 'Email not verified' } },
    }),
    UnauthorizedResponse,
    TooManyRequestsResponse,
  );

export const ApiLoginGoogle = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Login / register with Google ID token',
      description:
        'Verifies the Google `idToken` against Google JWKS. ' +
        'Creates a new user on first login or returns tokens for an existing one.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['idToken'],
        properties: {
          idToken: {
            type: 'string',
            example: 'eyJhbGci...',
            description: 'Google ID token from client-side OAuth flow',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Authenticated',
      ...AuthResultSchema,
    }),
    UnauthorizedResponse,
  );

export const ApiLoginApple = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Login / register with Apple identity token',
      description:
        'Verifies the Apple `identityToken` against Apple JWKS. ' +
        'Pass `email` only on the very first Sign in with Apple (Apple sends it once).',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['identityToken'],
        properties: {
          identityToken: {
            type: 'string',
            example: 'eyJhbGci...',
            description:
              'Apple identity token from client-side Sign in with Apple',
          },
          email: {
            type: 'string',
            format: 'email',
            nullable: true,
            example: 'user@privaterelay.appleid.com',
            description: 'Email returned by Apple on first login only',
          },
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Authenticated',
      ...AuthResultSchema,
    }),
    UnauthorizedResponse,
  );

export const ApiRefreshTokens = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Rotate refresh token',
      description:
        'Exchanges a valid refresh token for a new access + refresh token pair. ' +
        'The old refresh token is revoked (rotation). Reuse of a revoked token ' +
        'invalidates the entire token family (reuse detection). ' +
        '**Rate limit:** 10 requests / min.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGci...' },
        },
      },
    }),
    HttpCode(HttpStatus.OK),
    ApiResponse({
      status: 200,
      description: 'New token pair issued',
      ...TokenPairSchema,
    }),
    UnauthorizedResponse,
    TooManyRequestsResponse,
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Logout',
      description:
        'Revokes a specific refresh token. ' +
        'Set `allDevices: true` to revoke all tokens for the authenticated user ' +
        '(sign out from every device).',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGci...' },
          allDevices: {
            type: 'boolean',
            default: false,
            description: 'If true, revokes all sessions for this user',
          },
        },
      },
    }),
    HttpCode(HttpStatus.NO_CONTENT),
    ApiResponse({ status: 204, description: 'Logged out' }),
    UnauthorizedResponse,
  );

export const ApiVerifyEmail = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Confirm email address',
      description:
        'Consumes the one-time token sent in the verification email and ' +
        'activates the user account. Token expires in 24 h.',
    }),
    ApiQuery({
      name: 'token',
      required: true,
      description: 'Raw verification token from the email link',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Email verified',
      schema: { example: { message: 'Email verified successfully' } },
    }),
    ApiResponse({
      status: 404,
      description: 'Token is invalid or expired',
      schema: {
        example: {
          statusCode: 404,
          message: 'Verification token is invalid or expired',
        },
      },
    }),
  );

export const ApiResendVerification = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Resend verification email',
      description:
        'Sends a new verification link to the given email if it exists and is not ' +
        'yet verified. Always returns the same response to prevent email enumeration. ' +
        '**Rate limit:** 3 requests / hour.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
        },
      },
    }),
    HttpCode(HttpStatus.OK),
    ApiResponse({
      status: 200,
      description:
        'Request accepted (response is always the same regardless of email existence)',
      schema: {
        example: {
          message:
            'If the email is registered, a verification link has been sent',
        },
      },
    }),
    TooManyRequestsResponse,
  );

export const ApiGetMe = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get current user (from JWT)',
      description: 'Returns the decoded JWT payload of the authenticated user.',
    }),
    ApiResponse({
      status: 200,
      description: 'Current user payload',
      schema: {
        example: {
          sub: 'a1b2c3d4-...',
          email: 'user@example.com',
          status: 'active',
          iat: 1710000000,
          exp: 1710000900,
        },
      },
    }),
    UnauthorizedResponse,
  );
