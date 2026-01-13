import { queryTransaction, decodeAddress, validateTransaction } from '@/lib/cq';

export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: any;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'cq_query',
    description: 'Query a Cardano CBOR transaction with optional query path',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Transaction CBOR as hex string (with or without 0x prefix)',
        },
        query: {
          type: 'string',
          description: 'Optional query path (e.g., "fee", "outputs.0.address", "outputs.*.value")',
        },
        format: {
          type: 'string',
          enum: ['json', 'raw', 'pretty'],
          description: 'Output format',
        },
        ada: {
          type: 'boolean',
          description: 'Display ADA amounts instead of lovelace',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'cq_decode_address',
    description: 'Decode a Cardano bech32 address',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Cardano address in bech32 format (e.g., addr1..., stake1...)',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'cq_validate',
    description: 'Validate a Cardano CBOR transaction',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Transaction CBOR as hex string (with or without 0x prefix)',
        },
      },
      required: ['input'],
    },
  },
];

export async function handleMcpRequest(request: McpRequest): Promise<McpResponse> {
  const { method, params, id } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'cq-mcp-server',
              version: '0.1.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };

      case 'tools/call':
        return await handleToolCall(id, params);

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message,
      },
    };
  }
}

async function handleToolCall(
  id: string | number | null,
  params: { name: string; arguments?: any }
): Promise<McpResponse> {
  const { name, arguments: args } = params;

  if (!args) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32602,
        message: 'Invalid params: arguments required',
      },
    };
  }

  try {
    switch (name) {
      case 'cq_query': {
        const input = args.input as string;
        const query = args.query as string | undefined;
        const format = args.format as 'json' | 'raw' | 'pretty' | undefined;
        const ada = args.ada as boolean | undefined;

        let inputBuffer: string | Buffer = input;
        const hexString = input.startsWith('0x') ? input.slice(2) : input;
        if (/^[0-9a-fA-F]+$/.test(hexString) && hexString.length >= 16) {
          inputBuffer = Buffer.from(hexString, 'hex');
        }

        const result = await queryTransaction(inputBuffer, query, { format, ada });

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          },
        };
      }

      case 'cq_decode_address': {
        const address = args.address as string;
        const result = await decodeAddress(address, true);
        const parsed = JSON.parse(result);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(parsed, null, 2),
              },
            ],
          },
        };
      }

      case 'cq_validate': {
        const input = args.input as string;
        let inputBuffer: string | Buffer = input;
        const hexString = input.startsWith('0x') ? input.slice(2) : input;
        if (/^[0-9a-fA-F]+$/.test(hexString) && hexString.length >= 16) {
          inputBuffer = Buffer.from(hexString, 'hex');
        }

        const isValid = await validateTransaction(inputBuffer);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ valid: isValid }),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}`,
          },
        };
    }
  } catch (error: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Tool execution failed',
        data: error.message,
      },
    };
  }
}
