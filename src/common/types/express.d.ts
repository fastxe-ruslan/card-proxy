import type { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends JwtPayload {}

    interface Request {
      correlationId?: string;
    }
  }
}
