"""Main FastAPI application for AI services."""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routes.chat import router as chat_router
from src.routes.files import router as files_router
from src.routes.models import router as models_router
from src.routes.test_generation import router as test_generation_router
from src.services.providers.openai_provider import OpenAIProvider
from src.services.providers.claude_provider import ClaudeProvider
from src.services.providers.ollama_provider import OllamaProvider
from src.services.tool_executor import ToolExecutor
import src.services.tool_executor as tool_executor_module

# Create FastAPI app
app = FastAPI(
    title="Veltris Codex AI Services",
    description="Python-based AI services for code generation, analysis, and documentation",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize providers
openai_provider_instance = OpenAIProvider() if settings.openai_api_key else None
claude_provider_instance = ClaudeProvider() if settings.anthropic_api_key else None
ollama_provider_instance = OllamaProvider()  # Always available if Ollama service is running

# Initialize tool executor with providers and set global instance
tool_executor_instance = ToolExecutor(openai_provider_instance, claude_provider_instance)
tool_executor_module.tool_executor = tool_executor_instance

# Include routers
app.include_router(chat_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(test_generation_router, prefix="/api")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Veltris Codex AI Services",
        "version": "1.0.0",
        "description": "Python-based AI services for code generation, analysis, and documentation",
        "status": "healthy",
        "endpoints": {
            "chat": "/api/chat",
            "models": "/api/models",
            "health": "/api/health"
        },
        "docs": "/docs" if settings.is_development else None
    }


if __name__ == "__main__":
    print(f"""
🐍 Veltris Codex AI Services Starting!

📡 Server:     http://{settings.host}:{settings.port}
🔧 Health:     http://{settings.host}:{settings.port}/api/health
🤖 Models:     http://{settings.host}:{settings.port}/api/models
💬 Chat:       http://{settings.host}:{settings.port}/api/chat
📚 Docs:       http://{settings.host}:{settings.port}/docs

🌍 Environment: {settings.environment}
🔥 Temperature: {settings.temperature}
🎯 Max Tokens: {settings.max_tokens}
    """)
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level=settings.log_level.lower()
    )
