import { config } from 'dotenv';

config();

interface Config {
  port: number;
  nodeEnv: string;
  aiServiceUrl: string;
  apiSecretKey?: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  frontendUrl: string;
}

export const appConfig: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  apiSecretKey: process.env.API_SECRET_KEY,
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

export const validateConfig = (): void => {
  console.log(`✅ Gateway configuration validated`);
  console.log(`📡 AI Service URL: ${appConfig.aiServiceUrl}`);
  console.log(`🌐 Frontend URL: ${appConfig.frontendUrl}`);
  console.log(`🔒 API Secret: ${appConfig.apiSecretKey ? 'Configured' : 'Not configured'}`);
};