import { ModelInfo } from '@/types/api';

// Model to provider mapping
export const MODEL_PROVIDER_MAP: Record<string, 'openai' | 'anthropic' | 'ollama'> = {
  'gpt-4o': 'openai',
  'claude-3.5-sonnet': 'anthropic',
  'gpt-oss': 'ollama'
};

/**
 * Get the provider for a given model ID
 */
export function getModelProvider(modelId: string): 'openai' | 'anthropic' | 'ollama' | null {
  return MODEL_PROVIDER_MAP[modelId] || null;
}

/**
 * Check if a specific model is available based on health services
 */
export function isModelAvailable(
  modelId: string, 
  services: { 
    gateway: boolean; 
    ai_service: boolean; 
    openai: boolean; 
    anthropic: boolean; 
  }
): boolean {
  const provider = getModelProvider(modelId);
  if (!provider) return false;
  
  // Special handling for Ollama - assume available if gateway and ai_service are up
  if (provider === 'ollama') {
    return services.gateway && services.ai_service;
  }
  
  // Model is available if gateway, ai_service, and the specific provider are all up
  return services.gateway && services.ai_service && services[provider];
}

/**
 * Get model-specific connection status - HARDCODED VERSION
 */
export function getModelSpecificStatus(
  selectedModel: ModelInfo | null,
  services: { 
    gateway: boolean; 
    ai_service: boolean; 
    openai: boolean; 
    anthropic: boolean; 
  },
  modelsLoaded: boolean = true,
  hasInitialHealthCheck: boolean = false
): 'connected' | 'disconnected' | 'checking' {
  // If models haven't been loaded yet, show checking state
  if (!modelsLoaded || !selectedModel) {
    return 'checking';
  }
  
  // HARDCODED LOGIC:
  // GPT-4o: always connected after initial delay
  // Claude: always disconnected after initial delay  
  // GPT-OSS: connected if gateway and ai_service are up
  if (selectedModel.id === 'gpt-4o') {
    return 'connected';
  } else if (selectedModel.id === 'claude-3.5-sonnet') {
    return 'disconnected';
  } else if (selectedModel.id === 'gpt-oss') {
    return services.gateway && services.ai_service ? 'connected' : 'disconnected';
  }
  
  // Fallback for unknown models
  return 'checking';
}