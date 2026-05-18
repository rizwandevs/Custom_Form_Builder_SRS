import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  jti: string;
}

const secret = process.env.JWT_SECRET || 'dev-secret';
const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

export function signToken(payload: Omit<JwtPayload, 'jti'>): { token: string; jti: string; expiresAt: Date } {
  const jti = randomUUID();
  const signOptions = { expiresIn: expiresIn || '24h' } as SignOptions;
  const token = jwt.sign({ ...payload, jti }, secret, signOptions);

  const decoded = jwt.decode(token) as { exp: number };
  const expiresAt = new Date(decoded.exp * 1000);

  return { token, jti, expiresAt };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
