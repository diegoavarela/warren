import { SignJWT, jwtVerify } from 'jose';

const jwtSecret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-jwt-secret-change-in-production'
);

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(jwtSecret);
  
  return jwt;
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, jwtSecret);
  return payload as unknown as JWTPayload;
}