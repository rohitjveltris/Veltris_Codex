import rateLimit from 'express-rate-limit';
import { appConfig } from '@/config.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: appConfig.rateLimitWindowMs,
  max: appConfig.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(appConfig.rateLimitWindowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Allow requests to continue even if rate limit store is down
  skipFailedRequests: false,
  skipSuccessfulRequests: false
});