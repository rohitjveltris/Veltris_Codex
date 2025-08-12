import cors from 'cors';
import { appConfig } from '@/config.js';

export const corsMiddleware = cors({
  origin: [appConfig.frontendUrl, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  // Important for streaming responses
  exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection']
});