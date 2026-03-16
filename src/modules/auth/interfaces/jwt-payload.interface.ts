export interface JwtPayload {
  sub: string;
  email: string;
  status: string;
  role: string;
  iat?: number;
  exp?: number;
}
