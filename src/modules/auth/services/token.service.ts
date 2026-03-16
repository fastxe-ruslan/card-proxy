import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { UserEntity } from '../entities/user.entity';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface TokenMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
  ) {}

  async generateTokenPair(
    user: UserEntity,
    meta: TokenMeta,
  ): Promise<TokenPair> {
    const familyId = randomUUID();
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(
      user.id,
      familyId,
      meta,
    );
    return { accessToken, refreshToken };
  }

  async generateAccessToken(user: UserEntity): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      status: user.status,
      role: user.role ?? 'user',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
        '15m') as never,
    });
  }

  async generateRefreshToken(
    userId: string,
    familyId: string,
    meta: TokenMeta,
  ): Promise<string> {
    const raw = randomUUID() + randomUUID();
    const tokenHash = this.hashToken(raw);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash,
        familyId,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        expiresAt: this.buildExpiresAt(),
        revokedAt: null,
      }),
    );

    return raw;
  }

  async rotateRefreshToken(
    rawToken: string,
    meta: TokenMeta,
  ): Promise<{ newRefreshToken: string; userId: string }> {
    const tokenHash = this.hashToken(rawToken);
    const found = await this.refreshRepo.findOne({ where: { tokenHash } });

    if (!found) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (found.revokedAt !== null) {
      await this.revokeFamily(found.familyId);
      throw new UnauthorizedException(
        'Token reuse detected — all sessions invalidated',
      );
    }

    if (found.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshRepo.update({ id: found.id }, { revokedAt: new Date() });

    const newRefreshToken = await this.generateRefreshToken(
      found.userId,
      found.familyId,
      meta,
    );

    return { newRefreshToken, userId: found.userId };
  }

  async revokeToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.refreshRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshRepo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private buildExpiresAt(): Date {
    const raw =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';
    if (raw.endsWith('d')) {
      return new Date(Date.now() + Number(raw.replace('d', '')) * 86_400_000);
    }
    if (raw.endsWith('h')) {
      return new Date(Date.now() + Number(raw.replace('h', '')) * 3_600_000);
    }
    return new Date(Date.now() + 30 * 86_400_000);
  }
}
