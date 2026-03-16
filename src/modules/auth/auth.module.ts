import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { AuthIdentityEntity } from './entities/auth-identity.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { EmailVerificationEntity } from './entities/email-verification.entity';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { SocialVerifierService } from './services/social-verifier.service';
import { EmailService } from './services/email.service';
import { JwtStrategy } from './guards/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      UserEntity,
      AuthIdentityEntity,
      RefreshTokenEntity,
      EmailVerificationEntity,
    ]),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SocialVerifierService,
    EmailService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    TypeOrmModule,
  ],
})
export class AuthModule {}
