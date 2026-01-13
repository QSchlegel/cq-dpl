import { NextRequest, NextResponse } from 'next/server';
import { handleMcpRequest, McpRequest } from '@/lib/mcp';
import { withRateLimit } from '@/lib/rateLimit';

async function handleMcp(request: NextRequest): Promise<NextResponse> {
  // Check if MCP is enabled
  const mcpEnabled = process.env.MCP_ENABLED !== 'false';
  if (!mcpEnabled) {
    return new NextResponse(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message: 'MCP server is disabled',
        },
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (request.method !== 'POST') {
    return new NextResponse(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    
    // Validate JSON-RPC 2.0 request
    if (body.jsonrpc !== '2.0' || !body.method) {
      return new NextResponse(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id || null,
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const mcpRequest: McpRequest = {
      jsonrpc: '2.0',
      id: body.id || null,
      method: body.method,
      params: body.params,
    };

    const response = await handleMcpRequest(mcpRequest);

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message,
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const POST = withRateLimit(handleMcp, {
  maxRequests: 200, // Higher limit for MCP
  windowMs: 60000,
});
