"""Streaming response models."""
from enum import Enum
from typing import Any, Dict, Optional, Union

from pydantic import BaseModel, Field


class StreamChunkType(str, Enum):
    """Types of streaming chunks."""
    AI_CHUNK = "ai_chunk"
    TOOL_STATUS = "tool_status"
    TOOL_RESULT = "tool_result"
    DONE = "done"
    ERROR = "error"


class ToolStatus(str, Enum):
    """Tool execution status."""
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


class StreamChunk(BaseModel):
    """Base streaming chunk model."""
    type: StreamChunkType
    timestamp: Optional[int] = Field(default=None)


class AIChunk(StreamChunk):
    """AI response chunk."""
    type: StreamChunkType = StreamChunkType.AI_CHUNK
    content: str = Field(..., description="AI response content")


class ToolStatusChunk(StreamChunk):
    """Tool execution status chunk."""
    type: StreamChunkType = StreamChunkType.TOOL_STATUS
    tool: str = Field(..., description="Tool name")
    status: ToolStatus = Field(..., description="Tool execution status")


class ToolResultChunk(StreamChunk):
    """Tool execution result chunk."""
    type: StreamChunkType = StreamChunkType.TOOL_RESULT
    tool: str = Field(..., description="Tool name")
    result: Any = Field(..., description="Tool execution result")


class DoneChunk(StreamChunk):
    """Stream completion chunk."""
    type: StreamChunkType = StreamChunkType.DONE


class ErrorChunk(StreamChunk):
    """Error chunk."""
    type: StreamChunkType = StreamChunkType.ERROR
    error: str = Field(..., description="Error message")


# Union type for all possible stream chunks
StreamMessage = Union[AIChunk, ToolStatusChunk, ToolResultChunk, DoneChunk, ErrorChunk]