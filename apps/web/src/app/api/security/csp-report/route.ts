import { NextRequest, NextResponse } from 'next/server';
import { securityReporter } from '../../../../security/security-reporter';

const RATE_LIMIT_MAX = 100; // Max reports per IP per hour
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `csp-report:${ip}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60 * 60 * 1000 });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (
      !contentType?.includes('application/json') &&
      !contentType?.includes('application/csp-report')
    ) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const body = await request.json();

    // Validate CSP report structure
    if (!body['csp-report']) {
      return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 });
    }

    const violation = body['csp-report'];

    // Validate required fields
    const requiredFields = [
      'blocked-uri',
      'document-uri',
      'effective-directive',
      'violated-directive',
    ];
    for (const field of requiredFields) {
      if (typeof violation[field] !== 'string') {
        return NextResponse.json({ error: `Missing or invalid field: ${field}` }, { status: 400 });
      }
    }

    // Report the violation
    await securityReporter.reportCSPViolation(violation);

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('CSP report processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Cleanup old rate limit entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of Array.from(rateLimitStore.entries())) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
); // Cleanup every 5 minutes
