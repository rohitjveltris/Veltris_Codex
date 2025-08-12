# Veltris Codex Backend

A production-ready AI-powered code generation backend with streaming support, built for the Veltris Codex frontend application.

## 🚀 Features

- **Multi-Model AI Support**: GPT-4o and Claude 3.5 Sonnet with intelligent switching
- **Function Calling**: AI models can execute tools contextually based on user intent
- **HTTP Streaming**: Real-time response streaming without WebSocket complexity
- **Smart Tools**: Code diffing, documentation generation, code analysis, and refactoring
- **Production Ready**: Rate limiting, security, error handling, and comprehensive testing
- **TypeScript**: Fully typed codebase with strict TypeScript configuration

## 🛠️ Available AI Tools

The AI models can automatically use these tools based on conversation context:

1. **Code Diff Generator**: Compare code versions with line-by-line analysis
2. **Documentation Generator**: Create BRD, SRD, README, and API documentation
3. **Code Analyzer**: Analyze code structure, patterns, and provide suggestions
4. **Code Refactoring**: Optimize, modernize, add types, or extract components

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (for GPT-4o)
- Anthropic API key (for Claude 3.5 Sonnet)

## 🔧 Installation

1. **Clone and setup**:
```bash
cd backend
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
```

3. **Edit `.env` file**:
```env
# Required: At least one AI API key
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Security
API_SECRET_KEY=your_optional_bearer_token_secret

# Server configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## 🚀 Development

Start the development server:
```bash
npm run dev
```

The server will start at `http://localhost:3001` with:
- 🔧 **Health**: `/api/health`
- 🤖 **Models**: `/api/models`  
- 💬 **Chat**: `/api/chat` (streaming)

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Tests include:
- Unit tests for all tool functions
- Integration tests for API endpoints
- Streaming behavior validation
- Rate limiting verification

## 📡 API Usage

### 1. Get Available Models
```bash
curl http://localhost:3001/api/models
```

### 2. Chat with Streaming
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Refactor this React component and generate documentation",
    "model": "gpt-4o",
    "context": {
      "filePath": "Button.tsx",
      "codeContent": "const Button = () => <button>Click</button>;"
    }
  }'
```

### 3. Stream Response Format
```json
data: {"type":"ai_chunk","content":"I'll help you refactor","timestamp":1699123456}
data: {"type":"tool_status","tool":"refactor_code","status":"executing","timestamp":1699123457}
data: {"type":"tool_result","tool":"refactor_code","result":{"refactoredCode":"..."},"timestamp":1699123458}
data: {"type":"done","timestamp":1699123459}
```

## 🏗️ Architecture

```
/backend
├── src/
│   ├── routes/           # API endpoints
│   │   ├── chat.ts      # Streaming chat endpoint
│   │   ├── models.ts    # Model listing
│   │   └── health.ts    # Health checks
│   ├── services/
│   │   ├── ai/
│   │   │   ├── providers/    # AI model integrations
│   │   │   │   ├── openai.ts
│   │   │   │   └── claude.ts
│   │   │   └── tools/        # AI tool implementations
│   │   │       ├── codeDiff.ts
│   │   │       ├── docGenerator.ts
│   │   │       ├── codeAnalyzer.ts
│   │   │       └── refactor.ts
│   │   └── toolExecutor.ts   # Tool orchestration
│   ├── middleware/           # Security & validation
│   ├── types/               # TypeScript definitions
│   └── config.ts            # Environment configuration
└── tests/                   # Comprehensive test suite
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Zod schema validation for all requests
- **Optional Auth**: Bearer token authentication support
- **CORS Protection**: Configurable origin restrictions
- **Error Handling**: Secure error responses without information leakage

## 🚀 Production Deployment

1. **Build the application**:
```bash
npm run build
```

2. **Set production environment**:
```env
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your_production_openai_key
ANTHROPIC_API_KEY=your_production_anthropic_key
API_SECRET_KEY=your_secure_bearer_token
FRONTEND_URL=https://your-frontend-domain.com
```

3. **Start production server**:
```bash
npm start
```

## 📊 Monitoring

Monitor your deployment with:

- **Health Check**: `GET /api/health` - Returns service status
- **Rate Limit Headers**: Check `X-RateLimit-*` headers
- **Error Logs**: Structured error logging in production
- **Uptime**: Health endpoint includes uptime metrics

## 🔧 Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | One of two | OpenAI API key for GPT-4o | - |
| `ANTHROPIC_API_KEY` | One of two | Anthropic API key for Claude | - |
| `API_SECRET_KEY` | Optional | Bearer token for authentication | - |
| `PORT` | No | Server port | 3001 |
| `NODE_ENV` | No | Environment (development/production) | development |
| `FRONTEND_URL` | No | Frontend URL for CORS | http://localhost:5173 |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (ms) | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window | 100 |

## 🤝 Frontend Integration

See [Frontend Integration Guide](./docs/frontend-integration.md) for detailed integration instructions including:

- React hooks for streaming chat
- TypeScript types
- Error handling patterns
- EventSource and Fetch examples

## 🐛 Troubleshooting

### Common Issues

1. **"At least one AI API key must be provided"**
   - Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to your `.env` file

2. **Rate limited responses**
   - Default: 100 requests per 15 minutes
   - Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`

3. **CORS errors**
   - Add your frontend URL to `FRONTEND_URL` in `.env`
   - Check CORS middleware configuration

4. **Streaming connection issues**
   - Verify `Content-Type: text/event-stream` headers
   - Check network proxy settings

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Veltris Codex ecosystem**