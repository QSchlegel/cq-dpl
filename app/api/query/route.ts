import { NextRequest, NextResponse } from 'next/server';
import { queryTransaction } from '@/lib/cq';
import { withRateLimit } from '@/lib/rateLimit';
import { queryRequestSchema } from '@/lib/validation';

async function handleQuery(request: NextRequest): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return new NextResponse(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const validated = queryRequestSchema.parse(body);

    // Convert hex string to buffer if needed
    let input: string | Buffer = validated.input;
    
    // Check if input is hex string (starts with 0x or is hex)
    if (typeof input === 'string') {
      const hexString = input.startsWith('0x') ? input.slice(2) : input;
      // If it's a valid hex string, convert to buffer
      if (/^[0-9a-fA-F]+$/.test(hexString) && hexString.length >= 16) {
        input = Buffer.from(hexString, 'hex');
      }
    }

    const result = await queryTransaction(input, validated.query, {
      format: validated.format,
      ada: validated.ada,
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        result,
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
          error: 'Query failed',
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

export const POST = withRateLimit(handleQuery);
