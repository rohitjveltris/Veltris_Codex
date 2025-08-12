"""Claude provider for AI chat functionality."""
import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Any, Optional

import anthropic
from anthropic import Anthropic

from src.config import settings
from src.models.streaming import AIChunk, ToolStatusChunk, ToolResultChunk, DoneChunk, ErrorChunk
from src.models.chat import ChatContext
from src.services.tool_executor import get_tool_executor, ToolExecutionError


class ClaudeProvider:
    """Claude provider for Claude 3.5 Sonnet model."""

    def __init__(self):
        if not settings.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")
        
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-sonnet-20241022"

    async def stream_chat(
        self, 
        message: str, 
        context: Optional[ChatContext] = None,
        documentation_settings: Optional[Dict[str, bool]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream AI chat response with tool calling."""
        try:
            # Prepare messages and system prompt
            messages, system_prompt = self._prepare_messages(message, context, documentation_settings)
            
            # Get available tools
            tools = list(get_tool_executor().get_available_tools().values())

            # Create streaming completion
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    messages=messages,
                    system=system_prompt,
                    tools=tools,
                    tool_choice={"type": "auto"},
                    stream=True,
                    temperature=settings.temperature,
                    max_tokens=settings.max_tokens
                )
            )

            current_tool_call = None
            
            for chunk in response:
                if chunk.type == "content_block_start":
                    if chunk.content_block.type == "tool_use":
                        # Tool execution starting
                        current_tool_call = {
                            "id": chunk.content_block.id,
                            "name": chunk.content_block.name,
                            "input": {}
                        }
                        
                        yield ToolStatusChunk(
                            tool=chunk.content_block.name,
                            status="executing",
                            timestamp=int(time.time() * 1000)
                        ).dict()

                elif chunk.type == "content_block_delta":
                    if chunk.delta.type == "text_delta":
                        # Regular text content
                        yield AIChunk(
                            content=chunk.delta.text,
                            timestamp=int(time.time() * 1000)
                        ).dict()

                elif chunk.type == "content_block_stop":
                    if hasattr(chunk, 'content_block') and chunk.content_block.type == "tool_use":
                        # Tool execution completed
                        try:
                            tool_name = chunk.content_block.name
                            tool_input = chunk.content_block.input
                            
                            # Execute tool
                            tool_result = await get_tool_executor().execute_tool(
                                tool_name, 
                                tool_input
                            )

                            if tool_result["success"]:
                                yield ToolResultChunk(
                                    tool=tool_name,
                                    result=tool_result["result"],
                                    timestamp=int(time.time() * 1000)
                                ).dict()

                                yield ToolStatusChunk(
                                    tool=tool_name,
                                    status="completed",
                                    timestamp=int(time.time() * 1000)
                                ).dict()
                            else:
                                yield ToolStatusChunk(
                                    tool=tool_name,
                                    status="failed",
                                    timestamp=int(time.time() * 1000)
                                ).dict()

                        except ToolExecutionError as e:
                            yield ErrorChunk(
                                error=f"Tool execution failed: {str(e)}",
                                timestamp=int(time.time() * 1000)
                            ).dict()

                elif chunk.type == "message_stop":
                    break

            # Send completion signal
            yield DoneChunk(timestamp=int(time.time() * 1000)).dict()

        except Exception as e:
            yield ErrorChunk(
                error=f"Claude API error: {str(e)}",
                timestamp=int(time.time() * 1000)
            ).dict()

    def _prepare_messages(
        self, 
        message: str, 
        context: Optional[ChatContext] = None,
        documentation_settings: Optional[Dict[str, bool]] = None
    ) -> tuple:
        """Prepare messages and system prompt for Claude API."""
        system_prompt = """You are an AI coding assistant for Veltris Codex. You help with code generation, analysis, refactoring, and documentation.

Available tools:
- generate_code_diff: Compare two versions of code and show differences
- generate_documentation: Create BRD, SRD, README, or API documentation
- analyze_code_structure: Analyze code patterns, structure, and provide improvement suggestions
- refactor_code: Refactor code with specific strategies (optimize, modernize, add types, extract components)

Use tools when appropriate to help users with their coding tasks. Always provide helpful explanations along with tool results. Be proactive in suggesting improvements and best practices."""

        if documentation_settings:
            selected_docs = [doc_type for doc_type, selected in documentation_settings.items() if selected]
            if selected_docs:
                system_prompt += f"\n\nThe user has indicated they want to generate the following documentation types: {', '.join(selected_docs)}. Prioritize using the 'generate_documentation' tool for these types when relevant to the user's query."

        messages = []

        # Add context if provided
        if context:
            context_parts = []
            
            if context.file_path:
                context_parts.append(f"File: {context.file_path}")
            
            if context.code_content:
                context_parts.append(f"Code:\n```\n{context.code_content}\n```")
            
            if context.project_structure:
                context_parts.append(f"Project structure:\n{context.project_structure}")

            if context_parts:
                messages.append({
                    "role": "user",
                    "content": f"Current context:\n{chr(10).join(context_parts)}"
                })

        # Add user message
        messages.append({
            "role": "user",
            "content": message
        })

        return messages, system_prompt

    async def is_available(self) -> bool:
        """Check if Claude API is available."""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=1
                )
            )
            return True
        except Exception:
            return False


# Global provider instance
claude_provider = ClaudeProvider() if settings.anthropic_api_key else None