"""Models route for AI services."""
from fastapi import APIRouter
from typing import List, Dict, Any
from src.config import settings
from src.services.providers.openai_provider import openai_provider
from src.services.providers.claude_provider import claude_provider
from src.services.providers.ollama_provider import ollama_provider

router = APIRouter()


@router.get("/models")
async def get_models():
    """Get available AI models and their status."""
    models = []
    
    # GPT-4o model
    models.append({
        "id": "gpt-4o",
        "name": "GPT-4o",
        "provider": "openai",
        "description": "Advanced OpenAI model with vision capabilities",
        "capabilities": [
            "text-generation",
            "code-generation", 
            "tool-calling",
            "image-analysis"
        ],
        "available": openai_provider is not None and bool(settings.openai_api_key)
    })
    
    # Claude 3.5 Sonnet model
    models.append({
        "id": "claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "provider": "anthropic",
        "description": "Advanced Anthropic model for complex reasoning",
        "capabilities": [
            "text-generation",
            "code-generation",
            "tool-calling",
            "reasoning"
        ],
        "available": claude_provider is not None and bool(settings.anthropic_api_key)
    })
    
    # GPT-OSS model (Ollama)
    ollama_available = False
    if ollama_provider:
        try:
            ollama_available = await ollama_provider.check_health()
        except Exception:
            ollama_available = False
    
    models.append({
        "id": "gpt-oss",
        "name": "GPT-OSS (Local)",
        "provider": "ollama",
        "description": "Local open-source model via Ollama",
        "capabilities": [
            "text-generation",
            "code-generation",
            "tool-calling",
            "local-execution"
        ],
        "available": ollama_available
    })
    
    # Calculate statistics
    total_models = len(models)
    available_models = sum(1 for model in models if model["available"])
    
    return {
        "models": models,
        "total": total_models,
        "available": available_models
    }


@router.get("/health")
async def get_health():
    """Get health status of AI services."""
    # Check provider availability
    openai_available = openai_provider is not None and bool(settings.openai_api_key)
    claude_available = claude_provider is not None and bool(settings.anthropic_api_key)
    
    ollama_available = False
    if ollama_provider:
        try:
            ollama_available = await ollama_provider.check_health()
        except Exception:
            ollama_available = False
    
    # Overall status
    any_available = openai_available or claude_available or ollama_available
    status = "healthy" if any_available else "unhealthy"
    
    return {
        "status": status,
        "version": "1.0.0",
        "uptime": 0,  # Could be implemented to track actual uptime
        "services": {
            "gateway": True,  # This service is running if we can respond
            "ai_service": True,  # This service is running if we can respond
            "openai": openai_available,
            "anthropic": claude_available,
            "ollama": ollama_available
        },
        "timestamp": None  # Could add actual timestamp if needed
    }