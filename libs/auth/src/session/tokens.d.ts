import { AuthSession, SessionConfig, User } from './types';
export interface TokenPayload {
  sub: string;
  email?: string;
  username?: string;
  iat: number;
  exp: number;
  device_id: string;
  auth_method: 'passkey' | 'opaque';
  session_id: string;
}
export interface RefreshTokenPayload {
  sub: string;
  iat: number;
  exp: number;
  device_id: string;
  session_id: string;
  token_type: 'refresh';
}
export declare class TokenManager {
  private config;
  private readonly JWT_SECRET;
  private readonly REFRESH_SECRET;
  constructor(config: SessionConfig);
  createSession(
    user: User,
    deviceId: string,
    authMethod: 'passkey' | 'opaque'
  ): Promise<AuthSession>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
  refreshSession(refreshToken: string, user: User): Promise<AuthSession>;
  isTokenExpired(token: string): boolean;
  shouldRefreshToken(token: string): boolean;
  extractUserFromToken(token: string): User | null;
  private signToken;
  private verifyToken;
  private decodeToken;
  private sign;
  private base64urlEncode;
  private base64urlDecode;
  private generateSessionId;
}
export declare const defaultSessionConfig: SessionConfig;
