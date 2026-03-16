import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterEmailDto } from './dto/register-email.dto';
import { LoginEmailDto } from './dto/login-email.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { ROUTES } from 'src/common/constants/routes';
import {
  ApiAuthTag,
  ApiGetMe,
  ApiLoginApple,
  ApiLoginEmail,
  ApiLoginGoogle,
  ApiLogout,
  ApiRefreshTokens,
  ApiRegisterEmail,
  ApiResendVerification,
  ApiVerifyEmail,
} from './docs/auth.controller.docs';

function extractMeta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@ApiAuthTag()
@Controller(ROUTES.AUTH.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiRegisterEmail()
  @Post(ROUTES.AUTH.REGISTER)
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  registerEmail(@Body() dto: RegisterEmailDto, @Req() req: Request) {
    return this.authService.registerEmail(dto, extractMeta(req));
  }

  @ApiLoginEmail()
  @Post(ROUTES.AUTH.LOGIN_EMAIL)
  @Throttle({ default: { ttl: 900000, limit: 5 } })
  loginEmail(@Body() dto: LoginEmailDto, @Req() req: Request) {
    return this.authService.loginEmail(dto, extractMeta(req));
  }

  @ApiLoginGoogle()
  @Post(ROUTES.AUTH.SOCIAL_GOOGLE)
  loginGoogle(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.authService.loginGoogle(dto, extractMeta(req));
  }

  @ApiLoginApple()
  @Post(ROUTES.AUTH.SOCIAL_APPLE)
  loginApple(@Body() dto: AppleAuthDto, @Req() req: Request) {
    return this.authService.loginApple(dto, extractMeta(req));
  }

  @ApiRefreshTokens()
  @Post(ROUTES.AUTH.TOKEN_REFRESH)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  refreshTokens(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshTokens(dto, extractMeta(req));
  }

  @ApiLogout()
  @Post(ROUTES.AUTH.LOGOUT)
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser('sub') userId: string,
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ) {
    return this.authService.logout(userId, dto, extractMeta(req));
  }

  @ApiVerifyEmail()
  @Get(ROUTES.AUTH.VERIFY_EMAIL)
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @ApiResendVerification()
  @Post(ROUTES.AUTH.RESEND_VERIFICATION)
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @ApiGetMe()
  @Get(ROUTES.AUTH.ME)
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
