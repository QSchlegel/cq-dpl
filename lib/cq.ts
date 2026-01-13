import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface QueryOptions {
  format?: 'json' | 'raw' | 'pretty';
  ada?: boolean;
}

export interface CqError extends Error {
  exitCode: number;
}

/**
 * Get the path to the cq binary
 */
function getCqBinaryPath(): string {
  const binaryPath = process.env.CQ_BINARY_PATH || path.join(process.cwd(), 'public', 'cq');
  
  // Check if binary exists
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`cq binary not found at ${binaryPath}. Please ensure the binary is built and available.`);
  }
  
  return binaryPath;
}

/**
 * Execute cq command with given arguments
 */
async function executeCq(args: string[], input?: string | Buffer): Promise<string> {
  const binaryPath = getCqBinaryPath();
  
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to spawn cq process: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const error: CqError = new Error(stderr || `cq exited with code ${code}`) as CqError;
        error.exitCode = code || 1;
        reject(error);
      } else {
        resolve(stdout);
      }
    });

    // Write input to stdin if provided
    if (input) {
      if (typeof input === 'string') {
        child.stdin.write(input);
      } else {
        child.stdin.write(input);
      }
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
}

/**
 * Convert input to hex string if it's a Buffer
 * For string inputs, ensure it's a valid hex string (strip 0x prefix if present)
 */
function prepareInput(input: string | Buffer): string {
  if (Buffer.isBuffer(input)) {
    return input.toString('hex');
  }
  // Strip 0x prefix if present, cq can handle hex strings directly
  return input.startsWith('0x') ? input.slice(2) : input;
}

/**
 * Query a transaction with optional query path
 */
export async function queryTransaction(
  input: string | Buffer,
  query?: string,
  options: QueryOptions = {}
): Promise<string> {
  const args: string[] = [];
  
  // Add format option
  if (options.format === 'json') {
    args.push('--json');
  } else if (options.format === 'raw') {
    args.push('--raw');
  }
  
  // Add ADA option
  if (options.ada) {
    args.push('--ada');
  }
  
  // Add query and input
  const inputHex = prepareInput(input);
  
  if (query) {
    args.push(query);
    args.push(inputHex);
  } else {
    args.push(inputHex);
  }

  return executeCq(args);
}

/**
 * Decode a Cardano address
 */
export async function decodeAddress(address: string, json: boolean = true): Promise<string> {
  const args = ['addr', address];
  
  if (json) {
    args.push('--json');
  }

  return executeCq(args);
}

/**
 * Validate a transaction
 */
export async function validateTransaction(input: string | Buffer): Promise<boolean> {
  try {
    const inputHex = prepareInput(input);
    await executeCq(['--check', inputHex]);
    return true;
  } catch (error) {
    const cqError = error as CqError;
    if (cqError.exitCode === 1) {
      return false;
    }
    throw error;
  }
}

/**
 * Check if cq binary is available
 */
export async function checkCqAvailable(): Promise<boolean> {
  try {
    const binaryPath = getCqBinaryPath();
    await execAsync(`${binaryPath} --version`);
    return true;
  } catch {
    return false;
  }
}
