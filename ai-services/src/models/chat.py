"""Chat-related models."""
from enum import Enum
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field


class AIModel(str, Enum):
    """Supported AI models."""
    GPT_4O = "gpt-4o"
    CLAUDE_3_5_SONNET = "claude-3.5-sonnet"
    GPT_OSS = "gpt-oss"


class ChatContext(BaseModel):
    """Context information for chat requests."""
    file_path: Optional[str] = Field(default=None, description="Current file path")
    code_content: Optional[str] = Field(default=None, description="Current code content")
    project_structure: Optional[str] = Field(default=None, description="Project structure info")
    referenced_files: Optional[Dict[str, str]] = Field(default=None, description="Referenced files with their content")
    working_directory: Optional[str] = Field(default=None, description="The current working directory")


class ToolCall(BaseModel):
    """Tool call request."""
    tool_name: str = Field(..., description="Name of the tool to execute")
    parameters: Dict = Field(..., description="Parameters for the tool")


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    model: AIModel = Field(..., description="AI model to use")
    context: Optional[ChatContext] = Field(default=None, description="Chat context")
    tool_call: Optional[ToolCall] = Field(default=None, description="Direct tool call to execute")


class ModelInfo(BaseModel):
    """Model information."""
    id: str = Field(..., description="Model ID")
    name: str = Field(..., description="Model display name")
    provider: str = Field(..., description="AI provider")
    description: str = Field(..., description="Model description")
    capabilities: List[str] = Field(..., description="Model capabilities")
    available: bool = Field(..., description="Model availability status")


class HealthStatus(BaseModel):
    """Service health status."""
    status: str = Field(..., description="Overall status")
    version: str = Field(..., description="Service version")
    uptime: int = Field(..., description="Uptime in seconds")
    models: Dict[str, bool] = Field(..., description="Model availability")
    timestamp: int = Field(..., description="Status timestamp")