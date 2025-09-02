// Type declaration for jsonwebtoken to ensure local types are used
declare module 'jsonwebtoken' {
  export interface SignOptions {
    algorithm?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    subject?: string;
    issuer?: string;
    jwtid?: string;
    keyid?: string;
    header?: object;
    encoding?: string;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    issuer?: string;
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    subject?: string;
    clockTolerance?: number;
    maxAge?: string | number;
    clockTimestamp?: number;
  }

  export interface JwtPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
    [key: string]: any;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): string | JwtPayload;

  export function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean }
  ): null | string | JwtPayload | { header: any; payload: JwtPayload; signature: string };

  export class JsonWebTokenError extends Error {
    constructor(message: string);
  }

  export class TokenExpiredError extends JsonWebTokenError {
    constructor(message: string, expiredAt: Date);
    expiredAt: Date;
  }

  export class NotBeforeError extends JsonWebTokenError {
    constructor(message: string, date: Date);
    date: Date;
  }
}