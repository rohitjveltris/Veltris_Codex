import { Readable } from 'stream';
import { appConfig } from '../config.js';

export interface ChatRequest {
  message: string;
  model: 'gpt-4o' | 'claude-3.5-sonnet' | 'gpt-oss';
  context?: {
    filePath?: string;
    codeContent?: string;
    projectStructure?: string;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  available: boolean;
}

export interface ModelsResponse {
  models: ModelInfo[];
  total: number;
  available: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime: number;
  models: Record<string, boolean>;
  timestamp: number;
}

export class AIProxyService {
  private aiServiceUrl: string;

  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  async streamChat(request: ChatRequest): Promise<Readable> {
    const response = await fetch(`${this.aiServiceUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from AI service');
    }

    // Create a readable stream that forwards the Python service stream
    const stream = new Readable({
      read() {
        // This will be handled by the data events
      }
    });

    // Handle the response stream
    const reader = response.body.getReader();
    
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            stream.push(null); // End the stream
            break;
          }
          
          // Forward the chunk to the client
          stream.push(value);
        }
      } catch (error) {
        stream.emit('error', error);
      }
    };

    pump();
    
    return stream;
  }

  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${this.aiServiceUrl}/api/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getHealth(): Promise<HealthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.aiServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${this.aiServiceUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const aiProxyService = new AIProxyService();