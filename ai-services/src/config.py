"""Configuration management for AI services."""
import os
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Server configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # AI API Keys
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    
    # AI Configuration
    max_tokens: int = Field(default=4000, env="MAX_TOKENS")
    temperature: float = Field(default=0.7, env="TEMPERATURE")
    request_timeout: int = Field(default=300, env="REQUEST_TIMEOUT")
    
    # Ollama Configuration
    ollama_base_url: str = Field(default="http://localhost:11434", env="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="gpt-oss:latest", env="OLLAMA_MODEL")
    ollama_timeout: int = Field(default=120, env="OLLAMA_TIMEOUT")
    
    # Gateway Communication
    gateway_url: str = Field(default="http://localhost:3001", env="GATEWAY_URL")
    gateway_secret: Optional[str] = Field(default=None, env="GATEWAY_SECRET")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    def validate_ai_keys(self) -> None:
        """Validate that at least one AI API key is provided."""
        if not self.openai_api_key and not self.anthropic_api_key:
            raise ValueError(
                "At least one AI API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) must be provided"
            )
        
        if self.openai_api_key:
            print("✅ OpenAI API key configured")
        else:
            print("⚠️  OpenAI API key not configured")
            
        if self.anthropic_api_key:
            print("✅ Anthropic API key configured")
        else:
            print("⚠️  Anthropic API key not configured")

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() == "production"


# Global settings instance
settings = Settings()

# Validate configuration on import
try:
    settings.validate_ai_keys()
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    if settings.is_production:
        raise
    else:
        print("⚠️  Continuing in development mode...")