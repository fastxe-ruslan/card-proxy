import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { UserEntity, UserStatus } from './entities/user.entity';
import {
  AuthIdentityEntity,
  AuthProvider,
} from './entities/auth-identity.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { EmailVerificationEntity } from './entities/email-verification.entity';
import { PasswordService } from './services/password.service';
import { TokenService, TokenPair } from './services/token.service';
import { SocialVerifierService } from './services/social-verifier.service';
import { EmailService } from './services/email.service';
import { RegisterEmailDto } from './dto/register-email.dto';
import { LoginEmailDto } from './dto/login-email.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuditService } from '../audit/audit.service';

export interface AuthResult extends TokenPair {
  user: { id: string; email: string; status: UserStatus };
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuthIdentityEntity)
    private readonly identityRepo: Repository<AuthIdentityEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly tokenRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(EmailVerificationEntity)
    private readonly emailVerificationRepo: Repository<EmailVerificationEntity>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly socialVerifier: SocialVerifierService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async registerEmail(
    dto: RegisterEmailDto,
    meta: RequestMeta,
  ): Promise<{ message: string; userId: string }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email.toLowerCase(),
        status: UserStatus.Unverified,
      }),
    );

    const passwordHash = await this.passwordService.hash(dto.password);
    await this.identityRepo.save(
      this.identityRepo.create({
        userId: user.id,
        provider: AuthProvider.Email,
        providerUserId: user.email,
        passwordHash,
        emailVerified: false,
        metadata: dto.name ? { name: dto.name } : null,
      }),
    );

    const verificationToken = await this.createEmailVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
    );

    this.auditService.log({
      actorId: user.id,
      actorType: 'user',
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { message: 'Verification email sent', userId: user.id };
  }

  async loginEmail(dto: LoginEmailDto, meta: RequestMeta): Promise<AuthResult> {
    const identity = await this.identityRepo.findOne({
      where: {
        provider: AuthProvider.Email,
        providerUserId: dto.email.toLowerCase(),
      },
    });

    if (!identity?.passwordHash) {
      this.auditService.log({
        action: 'user.login_failed',
        entityType: 'user',
        entityId: dto.email,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.passwordService.verify(
      identity.passwordHash,
      dto.password,
    );
    if (!isValid) {
      this.auditService.log({
        action: 'user.login_failed',
        entityType: 'user',
        entityId: dto.email,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!identity.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    const user = await this.userRepo.findOneByOrFail({ id: identity.userId });
    this.assertActive(user);

    const tokens = await this.tokenService.generateTokenPair(user, meta);

    this.auditService.log({
      actorId: user.id,
      actorType: 'user',
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { ...tokens, user: this.publicUser(user) };
  }

  async loginGoogle(
    dto: GoogleAuthDto,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const payload = await this.socialVerifier.verifyGoogle(dto.idToken);
    return this.handleSocialLogin(
      AuthProvider.Google,
      payload.subject,
      payload.email,
      {
        emailVerified: payload.emailVerified,
        name: payload.name,
        meta,
      },
    );
  }

  async loginApple(dto: AppleAuthDto, meta: RequestMeta): Promise<AuthResult> {
    const payload = await this.socialVerifier.verifyApple(
      dto.identityToken,
      dto.email,
    );
    return this.handleSocialLogin(
      AuthProvider.Apple,
      payload.subject,
      payload.email,
      {
        emailVerified: payload.emailVerified,
        meta,
      },
    );
  }

  async refreshTokens(
    dto: RefreshTokenDto,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const { newRefreshToken, userId } =
      await this.tokenService.rotateRefreshToken(dto.refreshToken, meta);

    const user = await this.userRepo.findOneByOrFail({ id: userId });
    this.assertActive(user);

    const accessToken = await this.tokenService.generateAccessToken(user);

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'user.token_refreshed',
      entityType: 'user',
      entityId: userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(
    userId: string,
    dto: LogoutDto,
    meta: RequestMeta,
  ): Promise<void> {
    if (dto.allDevices) {
      await this.tokenService.revokeAllUserTokens(userId);
      this.auditService.log({
        actorId: userId,
        actorType: 'user',
        action: 'user.logout_all',
        entityType: 'user',
        entityId: userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    } else {
      await this.tokenService.revokeToken(dto.refreshToken);
      this.auditService.log({
        actorId: userId,
        actorType: 'user',
        action: 'user.logout',
        entityType: 'user',
        entityId: userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.emailVerificationRepo.findOne({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new NotFoundException('Verification token is invalid or expired');
    }

    await this.emailVerificationRepo.update(
      { id: record.id },
      { usedAt: new Date() },
    );
    await this.identityRepo.update(
      { userId: record.userId, provider: AuthProvider.Email },
      { emailVerified: true },
    );
    await this.userRepo.update(
      { id: record.userId },
      { status: UserStatus.Active },
    );

    this.auditService.log({
      actorId: record.userId,
      actorType: 'user',
      action: 'user.email_verified',
      entityType: 'user',
      entityId: record.userId,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return {
        message:
          'If the email is registered, a verification link has been sent',
      };
    }

    const identity = await this.identityRepo.findOne({
      where: { userId: user.id, provider: AuthProvider.Email },
    });
    if (!identity || identity.emailVerified) {
      return {
        message:
          'If the email is registered, a verification link has been sent',
      };
    }

    const verificationToken = await this.createEmailVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
    );
    return {
      message: 'If the email is registered, a verification link has been sent',
    };
  }

  private async handleSocialLogin(
    provider: AuthProvider,
    providerUserId: string,
    email: string,
    options: { emailVerified: boolean; name?: string; meta: RequestMeta },
  ): Promise<AuthResult> {
    let identity = await this.identityRepo.findOne({
      where: { provider, providerUserId },
    });

    let user: UserEntity;
    if (identity) {
      user = await this.userRepo.findOneByOrFail({ id: identity.userId });
    } else {
      user =
        (await this.userRepo.findOne({
          where: { email: email.toLowerCase() },
        })) ??
        (await this.userRepo.save(
          this.userRepo.create({
            email: email.toLowerCase(),
            status: UserStatus.Active,
          }),
        ));

      identity = await this.identityRepo.save(
        this.identityRepo.create({
          userId: user.id,
          provider,
          providerUserId,
          emailVerified: options.emailVerified,
          metadata: options.name ? { name: options.name } : null,
        }),
      );

      if (user.status === UserStatus.Unverified) {
        await this.userRepo.update(
          { id: user.id },
          { status: UserStatus.Active },
        );
        user.status = UserStatus.Active;
      }
    }

    this.assertActive(user);
    const tokens = await this.tokenService.generateTokenPair(
      user,
      options.meta,
    );

    this.auditService.log({
      actorId: user.id,
      actorType: 'user',
      action: 'user.social_login',
      entityType: 'user',
      entityId: user.id,
      ip: options.meta.ip,
      userAgent: options.meta.userAgent,
    });

    return { ...tokens, user: this.publicUser(user) };
  }

  private async createEmailVerificationToken(userId: string): Promise<string> {
    const raw = randomUUID();
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    await this.emailVerificationRepo.save(
      this.emailVerificationRepo.create({
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
      }),
    );
    return raw;
  }

  private assertActive(user: UserEntity): void {
    if (user.status === UserStatus.Suspended) {
      throw new ForbiddenException('Account suspended');
    }
    if (user.status === UserStatus.Deleted) {
      throw new ForbiddenException('Account deleted');
    }
  }

  private publicUser(user: UserEntity) {
    return { id: user.id, email: user.email, status: user.status };
  }
}
