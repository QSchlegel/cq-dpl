# cq-dpl

Next.js server wrapper around the cq CBOR query tool for Cardano.

## Features

- **Web UI**: Simple interface for querying transactions, decoding addresses, and validating CBOR
- **REST API**: HTTP endpoints for programmatic access
- **MCP Server**: Model Context Protocol server for AI tool integration
- **Rate Limiting**: Sliding window rate limiting per IP
- **AWS Infrastructure**: Terraform configuration for EC2 deployment

## Quick Start

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install the cq binary:
   ```bash
   cargo install cq
   cp ~/.cargo/bin/cq public/cq
   ```
   
   Or if cq is already in your PATH:
   ```bash
   which cq > public/cq || cp $(which cq) public/cq
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## API Endpoints

### POST /api/query

Query a Cardano transaction.

Request:
```json
{
  "input": "84a40081825820...",
  "query": "fee",
  "format": "json",
  "ada": false
}
```

Response:
```json
{
  "success": true,
  "result": "..."
}
```

### POST /api/address

Decode a Cardano address.

Request:
```json
{
  "address": "addr1qy8ac7qqy0vtulyl7wntmsxc6wex80gvcyjy33qffrhm7sh927ysx5sftuw0dlft05dz3c7revpf7jx0xnlcjz3g69mq4afdhv"
}
```

Response:
```json
{
  "success": true,
  "result": { ... }
}
```

### POST /api/validate

Validate a Cardano transaction.

Request:
```json
{
  "input": "84a40081825820..."
}
```

Response:
```json
{
  "success": true,
  "valid": true
}
```

### POST /api/mcp

MCP (Model Context Protocol) server endpoint. Implements JSON-RPC 2.0 protocol.

## MCP Server

The MCP server exposes three tools:

1. **cq_query**: Query a Cardano CBOR transaction
2. **cq_decode_address**: Decode a Cardano bech32 address
3. **cq_validate**: Validate a Cardano CBOR transaction

## Rate Limiting

Rate limiting is applied to all API endpoints:
- Default: 100 requests per minute per IP
- Configurable via environment variables:
  - `RATE_LIMIT_WINDOW_MS`: Window size in milliseconds (default: 60000)
  - `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Reset time (ISO 8601)

## Environment Variables

- `CQ_BINARY_PATH`: Path to cq binary (default: `/public/cq`)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)
- `MCP_ENABLED`: Enable MCP server (default: true)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

## AWS Deployment

See [infrastructure/terraform/README.md](infrastructure/terraform/README.md) for Terraform setup and [infrastructure/scripts/README.md](infrastructure/scripts/README.md) for deployment instructions.

## Architecture

The application is designed to be extensible:

- **Modular API routes**: Easy to add new endpoints
- **Pluggable rate limiting**: Can be upgraded to Redis
- **MCP protocol**: Standard protocol for AI tool integration
- **Infrastructure as Code**: Terraform for reproducible deployments

## Future Enhancements

- Database integration for query history
- Authentication and API keys
- Redis caching for frequently queried transactions
- WebSocket support for real-time queries
- Batch processing for multiple transactions
- GraphQL API layer
- CloudWatch/Prometheus monitoring

## License

MIT
