export class TokenManager {
  config;
  JWT_SECRET = process.env['JWT_SECRET'] || 'dev-secret-key';
  REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'dev-refresh-secret-key';
  constructor(config) {
    this.config = config;
  }
  async createSession(user, deviceId, authMethod) {
    const now = new Date();
    const sessionId = await this.generateSessionId();
    const accessTokenExp = new Date(now.getTime() + this.config.accessTokenExpiry * 60 * 1000);
    const refreshTokenExp = new Date(
      now.getTime() + this.config.refreshTokenExpiry * 24 * 60 * 60 * 1000
    );
    const accessTokenPayload = {
      sub: user.id,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(accessTokenExp.getTime() / 1000),
      device_id: deviceId,
      auth_method: authMethod,
      session_id: sessionId,
      ...(user.email && { email: user.email }),
      ...(user.username && { username: user.username }),
    };
    const refreshTokenPayload = {
      sub: user.id,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(refreshTokenExp.getTime() / 1000),
      device_id: deviceId,
      session_id: sessionId,
      token_type: 'refresh',
    };
    const accessToken = await this.signToken(accessTokenPayload, this.JWT_SECRET);
    const refreshToken = await this.signToken(refreshTokenPayload, this.REFRESH_SECRET);
    return {
      accessToken,
      refreshToken,
      expiresAt: accessTokenExp,
      expiresIn: this.config.accessTokenExpiry * 60,
      tokenType: 'Bearer',
      user,
    };
  }
  async verifyAccessToken(token) {
    try {
      const payload = await this.verifyToken(token, this.JWT_SECRET);
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token expired');
      }
      return payload;
    } catch (error) {
      throw new Error(
        `Invalid access token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async verifyRefreshToken(token) {
    try {
      const payload = await this.verifyToken(token, this.REFRESH_SECRET);
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Refresh token expired');
      }
      if (payload.token_type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }
      return payload;
    } catch (error) {
      throw new Error(
        `Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  async refreshSession(refreshToken, user) {
    const refreshPayload = await this.verifyRefreshToken(refreshToken);
    // Generate new session with same device and method info
    return await this.createSession(
      user,
      refreshPayload.device_id,
      'passkey' // Default, should be retrieved from stored session data
    );
  }
  isTokenExpired(token) {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true; // If we can't decode it, consider it expired
    }
  }
  shouldRefreshToken(token) {
    try {
      const payload = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;
      const thresholdSeconds = this.config.autoRefreshThreshold * 60;
      return timeUntilExpiry <= thresholdSeconds && timeUntilExpiry > 0;
    } catch {
      return false;
    }
  }
  extractUserFromToken(token) {
    try {
      const payload = this.decodeToken(token);
      const user = {
        id: payload.sub,
        createdAt: new Date(), // Would be fetched from database in real implementation
        emailVerified: true, // Would be part of token payload
      };
      if (payload.email) {
        user.email = payload.email;
      }
      if (payload.username) {
        user.username = payload.username;
      }
      return user;
    } catch {
      return null;
    }
  }
  async signToken(payload, secret) {
    // Simple JWT implementation for demo - in production, use a proper library like jsonwebtoken
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const encodedHeader = this.base64urlEncode(JSON.stringify(header));
    const encodedPayload = this.base64urlEncode(JSON.stringify(payload));
    const signature = await this.sign(`${encodedHeader}.${encodedPayload}`, secret);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  async verifyToken(token, secret) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new Error('Invalid token format');
    }
    // Verify signature
    const expectedSignature = await this.sign(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }
    // Decode payload
    const payload = JSON.parse(this.base64urlDecode(encodedPayload));
    return payload;
  }
  decodeToken(token) {
    const [, encodedPayload] = token.split('.');
    if (!encodedPayload) {
      throw new Error('Invalid token format');
    }
    return JSON.parse(this.base64urlDecode(encodedPayload));
  }
  async sign(data, secret) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
      return this.base64urlEncode(new Uint8Array(signature));
    } else {
      // Node.js fallback - simple hash for demo
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(data);
      return this.base64urlEncode(hmac.digest());
    }
  }
  base64urlEncode(data) {
    let base64;
    if (typeof data === 'string') {
      base64 = btoa(data);
    } else {
      // Convert Uint8Array or Buffer to string
      const bytes = Array.from(data);
      base64 = btoa(String.fromCharCode(...bytes));
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  base64urlDecode(data) {
    // Add padding
    const padded = data + '==='.slice(0, (4 - (data.length % 4)) % 4);
    // Replace URL-safe characters
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  }
  async generateSessionId() {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      const crypto = await import('crypto');
      const buffer = crypto.randomBytes(16);
      array.set(buffer);
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
export const defaultSessionConfig = {
  accessTokenExpiry: 60, // 1 hour
  refreshTokenExpiry: 7, // 7 days
  autoRefreshThreshold: 5, // Refresh 5 minutes before expiry
  maxConcurrentSessions: 3,
  sessionTimeout: 60 * 8, // 8 hours of inactivity
};
//# sourceMappingURL=tokens.js.map
