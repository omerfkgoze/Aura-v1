import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Production-only headers
  if (process.env['NODE_ENV'] === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  }

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    process.env['NODE_ENV'] === 'development'
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    process.env['NODE_ENV'] === 'development'
      ? "connect-src 'self' http://localhost:* https://*.supabase.co wss://*.supabase.co"
      : "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env['NODE_ENV'] === 'production' ? ['upgrade-insecure-requests'] : []),
  ];

  const cspHeader = cspDirectives.join('; ');
  response.headers.set('Content-Security-Policy', cspHeader);

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
