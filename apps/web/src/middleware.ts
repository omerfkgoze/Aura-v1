import { NextRequest, NextResponse } from 'next/server';

// Security middleware for development environment
// Implements CORS, CSP, and other security headers

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get environment variables
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [
    'http://localhost:3000',
    'http://localhost:19006',
  ];
  
  // CORS Configuration
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (isDevelopment) {
    // In development, allow localhost with any port
    if (origin && origin.includes('localhost')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token'
  );
  
  // Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // HTTPS Redirect (only in production)
  if (!isDevelopment && request.nextUrl.protocol === 'http:') {
    return NextResponse.redirect(
      `https://${request.nextUrl.host}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Relaxed for development
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:* https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests", // Only in production
  ];
  
  // Adjust CSP for development
  if (isDevelopment) {
    // Remove upgrade-insecure-requests in development (we use HTTP locally)
    const cspIndex = cspDirectives.indexOf('upgrade-insecure-requests');
    if (cspIndex > -1) {
      cspDirectives.splice(cspIndex, 1);
    }
    
    // Allow eval for development tools
    cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  }
  
  const csp = cspDirectives.join('; ');
  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers for production
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }
  
  return response;
}

// Apply middleware to API routes and specific pages
export const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico|certificates).*)',
  ],
};