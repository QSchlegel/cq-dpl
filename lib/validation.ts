import { z } from 'zod';

export const queryRequestSchema = z.object({
  input: z.string().min(1, 'Input is required'),
  query: z.string().optional(),
  format: z.enum(['json', 'raw', 'pretty']).optional(),
  ada: z.boolean().optional(),
});

export const addressRequestSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  json: z.boolean().optional().default(true),
});

export const validateRequestSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;
export type AddressRequest = z.infer<typeof addressRequestSchema>;
export type ValidateRequest = z.infer<typeof validateRequestSchema>;
