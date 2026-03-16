import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T extends JwtPayload>(
    err: Error | null,
    user: T | false,
    info: { message?: string } | null,
  ): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException(info?.message ?? 'Unauthorized');
    }
    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended');
    }
    if (user.status === 'deleted') {
      throw new ForbiddenException('Account deleted');
    }
    return user;
  }
}
