import express from 'express';
import { appConfig, validateConfig } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

// Import routes
import chatRoutes from './routes/chat.js';
import modelsRoutes from './routes/models.js';
import healthRoutes from './routes/health.js';
import filesRoutes from './routes/files.js';

const app = express();

// Validate configuration on startup
try {
  validateConfig();
  console.log('✅ Configuration validated successfully');
} catch (error) {
  console.error('❌ Configuration validation failed:', error);
  process.exit(1);
}

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all routes
app.use(rateLimitMiddleware);

// Health check (before other routes)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/chat', chatRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/files', filesRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Veltris Codex Backend',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      chat: '/api/chat',
      models: '/api/models',
      health: '/api/health'
    },
    timestamp: Date.now()
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(appConfig.port, () => {
  console.log(`
🚀 Veltris Codex Backend is running!

📡 Server:     http://localhost:${appConfig.port}
🔧 Health:     http://localhost:${appConfig.port}/api/health
🤖 Models:     http://localhost:${appConfig.port}/api/models
💬 Chat:       http://localhost:${appConfig.port}/api/chat

🌍 Environment: ${appConfig.nodeEnv}
🔒 Rate Limit:  ${appConfig.rateLimitMaxRequests} requests per ${appConfig.rateLimitWindowMs / 1000 / 60} minutes

${appConfig.openaiApiKey ? '✅ OpenAI API configured' : '⚠️  OpenAI API not configured'}
${appConfig.anthropicApiKey ? '✅ Anthropic API configured' : '⚠️  Anthropic API not configured'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;