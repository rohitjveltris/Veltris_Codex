import { Router, Request, Response } from 'express';
import { HealthCheckResponse } from '@/types/api.js';
import { aiProxyService } from '@/services/aiProxy.js';
import { asyncHandler } from '@/middleware/error.js';

const router = Router();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const uptime = Date.now() - serverStartTime;
  
  try {
    // Get health from Python AI services
    const aiServiceHealth = await aiProxyService.getHealth();
    
    const healthResponse: HealthCheckResponse = {
      status: aiServiceHealth.status,
      version: '1.0.0',
      uptime: Math.floor(uptime / 1000), // Convert to seconds
      services: {
        gateway: true,
        ai_service: await aiProxyService.isAvailable(),
        ...aiServiceHealth.models
      }
    };

    // Set appropriate HTTP status code based on health
    const httpStatus = healthResponse.status === 'unhealthy' ? 503 : 200;

    res.status(httpStatus).json({
      success: healthResponse.status !== 'unhealthy',
      data: healthResponse,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Fallback health response
    const healthResponse: HealthCheckResponse = {
      status: 'unhealthy',
      version: '1.0.0',
      uptime: Math.floor(uptime / 1000),
      services: {
        gateway: true,
        ai_service: false,
        openai: false,
        anthropic: false
      }
    };

    res.status(503).json({
      success: false,
      data: healthResponse,
      timestamp: Date.now()
    });
  }
}));

export default router;