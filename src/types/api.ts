export interface ChatRequest {
  message: string;
  model: string;
  context?: {
    file_path?: string;
    code_content?: string;
    documentation_settings?: Record<string, boolean>;
    referenced_files?: Record<string, string>;
  };
  tool_call?: {
    tool_name: string;
    parameters: any;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  description?: string;
  capabilities?: string[];
  available: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    gateway: boolean;
    ai_service: boolean;
    openai?: boolean;
    anthropic?: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

export interface ConnectionState {
  status: ConnectionStatus;
  lastChecked: number;
  error?: string;
  services: {
    gateway: boolean;
    ai_service: boolean;
    openai: boolean;
    anthropic: boolean;
  };
}