import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createCSPMiddleware } from './middleware/csp';
import { createSecurityHeadersMiddleware } from './middleware/security-headers';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');

  // Get allowed origins from environment variable
  const corsOrigin = process.env['CORS_ORIGIN'] || 'http://localhost:3000,http://localhost:19006';
  const allowedOrigins = corsOrigin.split(',').map(o => o.trim());

  // CORS configuration
  if (origin) {
    // Check if origin is allowed
    const isAllowed =
      allowedOrigins.includes(origin) ||
      (process.env['NODE_ENV'] === 'development' && origin.startsWith('http://localhost:'));

    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  }

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token'
  );

  // Apply security headers middleware
  const securityHeadersMiddleware = createSecurityHeadersMiddleware();
  securityHeadersMiddleware(request, response);

  // Apply CSP middleware with reporting
  const cspMiddleware = createCSPMiddleware({
    reportUri: '/api/security/csp-report',
    enableTrustedTypes: true,
    enableWasm: true,
  });
  cspMiddleware(request, response);

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  // Redirect HTTP to HTTPS in production
  if (process.env['NODE_ENV'] === 'production' && request.nextUrl.protocol === 'http:') {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl.toString(), 301);
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico|certificates).*)',
  ],
};
