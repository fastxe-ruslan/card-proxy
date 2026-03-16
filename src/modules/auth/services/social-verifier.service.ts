import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SocialTokenPayload {
  subject: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

type JoseModule = typeof import('jose');
type JwksResolver = ReturnType<JoseModule['createRemoteJWKSet']>;

interface CachedJwks {
  resolver: JwksResolver;
  expiresAt: number;
}

let joseCache: JoseModule | null = null;
const JWKS_TTL_MS = 3_600_000;
const jwksCache = new Map<string, CachedJwks>();

function loadJose(): Promise<JoseModule> {
  if (joseCache) return Promise.resolve(joseCache);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  return (new Function('return import("jose")')() as Promise<JoseModule>).then(
    (mod) => {
      joseCache = mod;
      return mod;
    },
  );
}

function getJwks(jose: JoseModule, url: string): JwksResolver {
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.resolver;
  const resolver = jose.createRemoteJWKSet(new URL(url));
  jwksCache.set(url, { resolver, expiresAt: Date.now() + JWKS_TTL_MS });
  return resolver;
}

@Injectable()
export class SocialVerifierService {
  private readonly logger = new Logger(SocialVerifierService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifyGoogle(idToken: string): Promise<SocialTokenPayload> {
    const jose = await loadJose();
    const jwks = getJwks(jose, 'https://www.googleapis.com/oauth2/v3/certs');
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!clientId) {
      this.logger.warn(
        'GOOGLE_CLIENT_ID not set — skipping audience validation',
      );
    }

    try {
      const { payload } = await jose.jwtVerify(idToken, jwks, {
        ...(clientId ? { audience: clientId } : {}),
      });

      return {
        subject: payload.sub ?? '',
        email: typeof payload.email === 'string' ? payload.email : '',
        emailVerified: payload.email_verified === true,
        name: typeof payload.name === 'string' ? payload.name : undefined,
      };
    } catch (err) {
      this.logger.error('Google token verification failed', {
        error: err instanceof Error ? err.message : String(err),
        clientId: clientId ?? '(not set)',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        tokenHeader: (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return JSON.parse(
              Buffer.from(idToken.split('.')[0], 'base64url').toString(),
            );
          } catch {
            return 'cannot decode header';
          }
        })(),
        tokenPayload: (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const p: {
              aud?: unknown;
              iss?: unknown;
              exp?: unknown;
              sub?: unknown;
            } = JSON.parse(
              Buffer.from(idToken.split('.')[1], 'base64url').toString(),
            );
            return { aud: p.aud, iss: p.iss, exp: p.exp, sub: p.sub };
          } catch {
            return 'cannot decode payload';
          }
        })(),
      });
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  async verifyApple(
    identityToken: string,
    clientProvidedEmail?: string,
  ): Promise<SocialTokenPayload> {
    const jose = await loadJose();
    const jwks = getJwks(jose, 'https://appleid.apple.com/auth/keys');
    const appId = this.configService.get<string>('APPLE_APP_ID');

    try {
      const { payload } = await jose.jwtVerify(identityToken, jwks, {
        issuer: 'https://appleid.apple.com',
        ...(appId ? { audience: appId } : {}),
      });

      if (!appId) {
        this.logger.warn('APPLE_APP_ID not set — skipping audience validation');
      }

      const email =
        typeof payload.email === 'string'
          ? payload.email
          : (clientProvidedEmail ?? '');

      return {
        subject: payload.sub ?? '',
        email,
        emailVerified: payload.email_verified === true,
        name: undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid Apple identity token');
    }
  }
}
