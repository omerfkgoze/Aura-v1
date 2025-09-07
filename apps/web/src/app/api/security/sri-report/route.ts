import { NextRequest, NextResponse } from 'next/server';
import { securityReporter } from '../../../../security/security-reporter';

interface SRIFailureReport {
  type: 'sri-failure';
  resourceUrl: string;
  expectedHash: string;
  timestamp: string;
  userAgent: string;
  actualHash?: string;
  errorMessage?: string;
}

const RATE_LIMIT_MAX = 50; // Max reports per IP per hour
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `sri-report:${ip}`;
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

function validateSRIReport(body: any): body is SRIFailureReport {
  return (
    body &&
    body.type === 'sri-failure' &&
    typeof body.resourceUrl === 'string' &&
    typeof body.expectedHash === 'string' &&
    typeof body.timestamp === 'string' &&
    typeof body.userAgent === 'string'
  );
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
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const body = await request.json();

    // Validate SRI report structure
    if (!validateSRIReport(body)) {
      return NextResponse.json({ error: 'Invalid SRI report format' }, { status: 400 });
    }

    // Additional validation
    if (!body.resourceUrl.match(/^\/[^\/].*\.(js|css|mjs)$/)) {
      return NextResponse.json({ error: 'Invalid resource URL format' }, { status: 400 });
    }

    if (!body.expectedHash.match(/^(sha256|sha384|sha512)-[A-Za-z0-9+\/]+=*$/)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 });
    }

    // Validate timestamp is recent (within 5 minutes)
    const reportTime = new Date(body.timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - reportTime) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Report timestamp too old or invalid' }, { status: 400 });
    }

    // Report the SRI failure
    await securityReporter.reportSRIFailure(body.resourceUrl, body.expectedHash);

    // Log additional context for debugging
    console.warn('SRI Failure Report:', {
      resourceUrl: body.resourceUrl,
      expectedHash: body.expectedHash,
      userAgent: body.userAgent.substring(0, 100), // Truncate user agent
      timestamp: body.timestamp,
    });

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('SRI report processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
); // Cleanup every 5 minutes
