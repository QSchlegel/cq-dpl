import { NextRequest, NextResponse } from 'next/server';
import { validateTransaction } from '@/lib/cq';
import { withRateLimit } from '@/lib/rateLimit';
import { validateRequestSchema } from '@/lib/validation';

async function handleValidate(request: NextRequest): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return new NextResponse(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const validated = validateRequestSchema.parse(body);

    // Convert hex string to buffer if needed
    let input: string | Buffer = validated.input;
    
    // Check if input is hex string
    if (typeof input === 'string') {
      const hexString = input.startsWith('0x') ? input.slice(2) : input;
      // If it's a valid hex string, convert to buffer
      if (/^[0-9a-fA-F]+$/.test(hexString) && hexString.length >= 16) {
        input = Buffer.from(hexString, 'hex');
      }
    }

    const isValid = await validateTransaction(input);

    return new NextResponse(
      JSON.stringify({
        success: true,
        valid: isValid,
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

    // Handle cq errors (validation failures are expected)
    if (error.exitCode === 1) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          valid: false,
        }),
        {
          status: 200,
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

export const POST = withRateLimit(handleValidate);
