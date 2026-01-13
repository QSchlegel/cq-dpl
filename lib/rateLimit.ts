import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, this should be replaced with Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection remote address (may not work in all environments)
  return request.ip || 'unknown';
}

/**
 * Sliding window rate limiter
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): RateLimitResult {
  const windowMs = config.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const maxRequests = config.maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  
  const clientIp = getClientIp(request);
  const now = Date.now();
  
  let entry = rateLimitStore.get(clientIp);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(clientIp, entry);
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  
  if (entry.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }
  
  rateLimitStore.set(clientIp, entry);
  
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = rateLimit(request, config);
    
    const response = result.success
      ? await handler(request)
      : new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${result.limit} requests per ${(config?.windowMs || 60000) / 1000} seconds`,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());
    
    return response;
  };
}
