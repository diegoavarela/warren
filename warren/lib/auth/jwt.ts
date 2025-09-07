import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
  return token;
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const payload = jwt.verify(token, jwtSecret) as JWTPayload;
  return payload;
}