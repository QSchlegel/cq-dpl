import { NextRequest, NextResponse } from 'next/server';
import { decodeAddress } from '@/lib/cq';
import { withRateLimit } from '@/lib/rateLimit';
import { addressRequestSchema } from '@/lib/validation';

async function handleAddress(request: NextRequest): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return new NextResponse(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const validated = addressRequestSchema.parse(body);

    const result = await decodeAddress(validated.address, validated.json);

    return new NextResponse(
      JSON.stringify({
        success: true,
        result: validated.json ? JSON.parse(result) : result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      return new NextResponse(
        JSON.stringify({
          error: 'Validation error',
          details: error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle cq errors
    if (error.exitCode !== undefined) {
      return new NextResponse(
        JSON.stringify({
          error: 'Address decode failed',
          message: error.message,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const POST = withRateLimit(handleAddress);
