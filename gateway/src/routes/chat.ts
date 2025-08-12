import { Router, Request, Response } from 'express';
import { ChatRequestSchema, ChatRequest } from '@/types/api.js';
import { aiProxyService } from '@/services/aiProxy.js';
import { validateRequest } from '@/middleware/validation.js';
import { optionalAuthMiddleware } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/error.js';

const router = Router();

// Apply middleware
router.use(optionalAuthMiddleware);

router.post('/', validateRequest(ChatRequestSchema), asyncHandler(async (req: Request, res: Response) => {
  const { message, model, context } = req.body as ChatRequest;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  try {
    // Proxy request to Python AI services
    const stream = await aiProxyService.streamChat({
      message,
      model,
      context
    });

    // Forward the stream to the client
    stream.on('data', (chunk) => {
      res.write(chunk);
    });

    stream.on('end', () => {
      clearInterval(keepAlive);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      const errorMessage = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now()
      };
      
      res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
      clearInterval(keepAlive);
      res.end();
    });

  } catch (error) {
    // Send error message
    const errorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now()
    };
    
    res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
    clearInterval(keepAlive);
    res.end();
  }
}));

export default router;