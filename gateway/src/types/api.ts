import { z } from 'zod';

// Chat request schema
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  model: z.enum(['gpt-4o', 'claude-3.5-sonnet', 'gpt-oss']),
  context: z.object({
    file_path: z.string().nullable().optional(),
    code_content: z.string().nullable().optional(),
    project_structure: z.string().nullable().optional(),
    referenced_files: z.record(z.string()).nullable().optional(),
    working_directory: z.string().nullable().optional(),
  }).nullable().optional()
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Model information
export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  description: string;
  capabilities: string[];
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    openai: boolean;
    anthropic: boolean;
  };
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: number;
}