import { Request, Response, NextFunction } from 'express';
import { appConfig } from '@/config.js';

export interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean;
}

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // If no API secret key is configured, skip auth
  if (!appConfig.apiSecretKey) {
    req.isAuthenticated = true;
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.isAuthenticated = false;
    return next();
  }

  const token = authHeader.substring(7);
  req.isAuthenticated = token === appConfig.apiSecretKey;
  
  next();
};

export const requireAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.isAuthenticated) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid bearer token required'
    });
  }
  
  next();
};