import { Router, Request, Response } from 'express';
import { aiProxyService } from '@/services/aiProxy.js';
import { asyncHandler } from '@/middleware/error.js';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get models from Python AI services
    const modelsData = await aiProxyService.getModels();

    res.json({
      success: true,
      data: modelsData,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to fetch models from AI service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models',
      timestamp: Date.now()
    });
  }
}));

export default router;