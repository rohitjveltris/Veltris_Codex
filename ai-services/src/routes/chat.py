"""Chat route for AI services."""
import asyncio
import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from src.config import settings
from src.models.chat import ChatRequest, AIModel
from src.services.providers.openai_provider import openai_provider
from src.services.providers.claude_provider import claude_provider
from src.services.providers.ollama_provider import ollama_provider
from src.services.tool_executor import get_tool_executor
from src.models.streaming import ToolStatusChunk, ToolResultChunk, DoneChunk, ErrorChunk


router = APIRouter()


@router.post("/chat")
async def stream_chat(request: ChatRequest):
    """Stream AI chat response."""
    print(f"DEBUG: Chat request received - Message: {request.message}")
    print(f"DEBUG: Chat request context: {request.context}")
    
    # Select provider based on model
    provider = None
    
    if request.model == AIModel.GPT_4O:
        if not openai_provider:
            raise HTTPException(
                status_code=503,
                detail="OpenAI service not available (API key not configured)"
            )
        provider = openai_provider
    
    elif request.model == AIModel.CLAUDE_3_5_SONNET:
        if not claude_provider:
            raise HTTPException(
                status_code=503,
                detail="Claude service not available (API key not configured)"
            )
        provider = claude_provider
    
    elif request.model == AIModel.GPT_OSS:
        if not ollama_provider:
            raise HTTPException(
                status_code=503,
                detail="Ollama service not available (service not running)"
            )
        # Check if Ollama service is actually running
        if not await ollama_provider.check_health():
            raise HTTPException(
                status_code=503,
                detail="Ollama service not available (cannot connect to localhost:11434)"
            )
        provider = ollama_provider
    
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model: {request.model}"
        )

    # Stream response
    async def generate_stream():
        try:
            # Check if this is a direct tool call
            if request.tool_call:
                # Execute tool directly instead of going through AI
                timestamp = int(asyncio.get_event_loop().time() * 1000)
                
                # Send tool execution status
                yield f"data: {json.dumps(ToolStatusChunk(tool=request.tool_call.tool_name, status='executing', timestamp=timestamp).dict())}\n\n"
                
                try:
                    # Execute the tool
                    tool_result = await get_tool_executor().execute_tool(
                        request.tool_call.tool_name,
                        request.tool_call.parameters,
                        context=request.context
                    )
                    
                    # Send tool result
                    result_timestamp = int(asyncio.get_event_loop().time() * 1000)
                    yield f"data: {json.dumps(ToolResultChunk(tool=request.tool_call.tool_name, result=tool_result['result'], timestamp=result_timestamp).dict())}\n\n"
                    yield f"data: {json.dumps(ToolStatusChunk(tool=request.tool_call.tool_name, status='completed', timestamp=result_timestamp).dict())}\n\n"
                    
                except Exception as tool_error:
                    error_timestamp = int(asyncio.get_event_loop().time() * 1000)
                    yield f"data: {json.dumps(ErrorChunk(error=f'Tool execution failed: {str(tool_error)}', timestamp=error_timestamp).dict())}\n\n"
                
                # Send completion
                done_timestamp = int(asyncio.get_event_loop().time() * 1000)
                yield f"data: {json.dumps(DoneChunk(timestamp=done_timestamp).dict())}\n\n"
                
            else:
                # Normal AI chat stream
                async for chunk in provider.stream_chat(
                    request.message,
                    request.context
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            error_chunk = {
                "type": "error",
                "error": str(e),
                "timestamp": int(asyncio.get_event_loop().time() * 1000)
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )



@router.get("/health")
async def health_check():
    """Health check endpoint."""
    # Check model availability
    model_status = {}
    
    if openai_provider:
        model_status["openai"] = await openai_provider.is_available()
    else:
        model_status["openai"] = False
    
    if claude_provider:
        model_status["claude"] = await claude_provider.is_available()
    else:
        model_status["claude"] = False

    # Determine overall status
    available_count = sum(model_status.values())
    if available_count == 2:
        status = "healthy"
    elif available_count == 1:
        status = "degraded"
    else:
        status = "unhealthy"

    return {
        "status": status,
        "version": "1.0.0",
        "uptime": int(asyncio.get_event_loop().time()),
        "models": model_status,
        "timestamp": int(asyncio.get_event_loop().time() * 1000)
    }