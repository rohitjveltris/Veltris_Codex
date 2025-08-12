"""OpenAI provider for AI chat functionality."""
import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Any, Optional

import openai
from openai import OpenAI

from src.config import settings
from src.models.streaming import AIChunk, ToolStatusChunk, ToolResultChunk, DoneChunk, ErrorChunk
from src.models.chat import ChatContext
from src.services.tool_executor import get_tool_executor, ToolExecutionError


class OpenAIProvider:
    """OpenAI provider for GPT-4o model."""

    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"

    async def stream_chat(
        self, 
        message: str, 
        context: Optional[ChatContext] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream AI chat response with tool calling."""
        try:
            # Prepare messages with context
            messages = self._prepare_messages(message, context)
            
            # Get available tools
            tools = get_tool_executor().get_available_tools()
            openai_tools = [
                {"type": "function", "function": tool} 
                for tool in tools.values()
            ]

            # Create streaming completion
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto",
                    stream=True,
                    temperature=settings.temperature,
                    max_tokens=settings.max_tokens
                )
            )

            current_tool_call = None
            tool_arguments = ""

            for chunk in response:
                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta:
                    continue

                # Handle regular text content
                if delta.content:
                    yield AIChunk(
                        content=delta.content,
                        timestamp=int(time.time() * 1000)
                    ).dict()

                # Handle tool calls
                if delta.tool_calls:
                    for tool_call in delta.tool_calls:
                        if tool_call.function and tool_call.function.name:
                            # New tool call starting
                            current_tool_call = {
                                "id": tool_call.id,
                                "name": tool_call.function.name,
                                "arguments": ""
                            }
                            
                            yield ToolStatusChunk(
                                tool=tool_call.function.name,
                                status="executing",
                                timestamp=int(time.time() * 1000)
                            ).dict()

                        if tool_call.function and tool_call.function.arguments:
                            if current_tool_call:
                                current_tool_call["arguments"] += tool_call.function.arguments

                # Check if tool call is complete
                if (chunk.choices[0].finish_reason == "tool_calls" and 
                    current_tool_call and 
                    current_tool_call["arguments"]):
                    
                    try:
                        # Parse tool arguments
                        args = json.loads(current_tool_call["arguments"])
                        
                        # Execute tool
                        tool_result = await get_tool_executor().execute_tool(
                            current_tool_call["name"], 
                            args,
                            context=context
                        )

                        if tool_result["success"]:
                            yield ToolResultChunk(
                                tool=current_tool_call["name"],
                                result=tool_result["result"],
                                timestamp=int(time.time() * 1000)
                            ).dict()

                            yield ToolStatusChunk(
                                tool=current_tool_call["name"],
                                status="completed",
                                timestamp=int(time.time() * 1000)
                            ).dict()
                        else:
                            yield ToolStatusChunk(
                                tool=current_tool_call["name"],
                                status="failed",
                                timestamp=int(time.time() * 1000)
                            ).dict()

                    except (json.JSONDecodeError, ToolExecutionError) as e:
                        yield ErrorChunk(
                            error=f"Tool execution failed: {str(e)}",
                            timestamp=int(time.time() * 1000)
                        ).dict()

                    current_tool_call = None

            # Send completion signal
            yield DoneChunk(timestamp=int(time.time() * 1000)).dict()

        except Exception as e:
            yield ErrorChunk(
                error=f"OpenAI API error: {str(e)}",
                timestamp=int(time.time() * 1000)
            ).dict()

    async def generate_text(self, prompt: str) -> str:
        """Generate text using OpenAI API (non-streaming)."""
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=settings.temperature,
                    max_tokens=settings.max_tokens
                )
            )
            content = response.choices[0].message.content.strip()
            
            # Additional cleanup to remove any markdown formatting that might slip through
            # Remove code block markers
            if content.startswith('```'):
                lines = content.split('\n')
                # Remove first line if it's a code block marker
                if lines[0].startswith('```'):
                    lines = lines[1:]
                # Remove last line if it's a code block marker
                if lines and lines[-1].strip() == '```':
                    lines = lines[:-1]
                content = '\n'.join(lines)
            
            return content.strip()
        except Exception as e:
            raise Exception(f"OpenAI text generation error: {str(e)}")

    def _prepare_messages(
        self, 
        message: str, 
        context: Optional[ChatContext] = None
    ) -> list:
        """Prepare messages for OpenAI API."""
        print(f"DEBUG: _prepare_messages called with message: {message}")
        print(f"DEBUG: Context: {context}")
        if context and context.referenced_files:
            print(f"DEBUG: Referenced files in context: {context.referenced_files}")
        
        system_content = """You are an AI coding assistant for Veltris Codex. You help with code generation, analysis, refactoring, and documentation.

Available tools:
- generate_code: For generating code in any language. Use this when the user asks you to generate code.
- generate_documentation: For creating a single document (BRD, SRD, README, or API_DOCS).
- generate_multiple_documentation: For creating multiple documents at once.
- modify_file_with_diff: PREFERRED for any code improvements, optimizations, or changes. Shows red/green diff for user approval before applying changes.
- smart_code_action: AI-powered code improvements with automatic strategy selection and diff preview.  
- comprehensive_code_review: Complete code review with security analysis, quality metrics, and AI insights.
- security_analysis: Analyze code for security vulnerabilities and weaknesses.
- analyze_code_structure: Analyze code patterns and structure
- refactor_code: Basic refactoring (use modify_file_with_diff instead for actual code changes)

IMPORTANT:
- When asked to generate code, use the `generate_code` tool. For example, if the user asks "Generate me a python function to find the first 20 fibonacci numbers", you should call the `generate_code` tool with the prompt "a python function to find the first 20 fibonacci numbers" and the file_path "fibonacci.py".
- When asked to generate documentation, use the `generate_documentation` or `generate_multiple_documentation` tools. Infer the `doc_types` from the user's message.
- When users request code improvements, optimizations, fixes, or changes to files, ALWAYS use 'modify_file_with_diff' to show a visual diff for approval.

Use tools when appropriate to help users with their coding tasks. Always provide helpful explanations along with tool results."""

        messages = [
            {
                "role": "system",
                "content": system_content
            }
        ]

        # Add context if provided
        if context:
            context_parts = []
            
            if context.file_path:
                context_parts.append(f"File: {context.file_path}")
            
            if context.code_content:
                context_parts.append(f"Code:\n```\n{context.code_content}\n```")
            
            if context.project_structure:
                context_parts.append(f"Project structure:\n{context.project_structure}")

            # Add referenced files content
            if context.referenced_files:
                context_parts.append("Referenced files:")
                for file_path, content in context.referenced_files.items():
                    context_parts.append(f"\n@{file_path}:\n```\n{content}\n```")

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

        return messages

    async def is_available(self) -> bool:
        """Check if OpenAI API is available."""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.models.list()
            )
            return True
        except Exception:
            return False


# Global provider instance
openai_provider = OpenAIProvider() if settings.openai_api_key else None