"""Ollama provider for local AI models with full GPT-4o feature parity."""
import asyncio
import json
import time
import aiohttp
from typing import AsyncGenerator, Dict, Any, Optional, List

from src.config import settings
from src.models.streaming import AIChunk, ToolStatusChunk, ToolResultChunk, DoneChunk, ErrorChunk
from src.models.chat import ChatContext
from src.services.tool_executor import get_tool_executor, ToolExecutionError


class OllamaProvider:
    """Ollama provider for local models with full tool calling support."""

    def __init__(self):
        self.base_url = getattr(settings, 'ollama_base_url', 'http://localhost:11434')
        self.model = getattr(settings, 'ollama_model', 'gpt-oss:latest')
        self.timeout = getattr(settings, 'ollama_timeout', 120)
        
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
            
            # Check if model supports tool calling by making initial request
            async with aiohttp.ClientSession() as session:
                # First, try with tool calling capability
                request_payload = {
                    "model": self.model,
                    "messages": messages,
                    "stream": True,
                    "tools": self._convert_tools_to_ollama_format(tools) if tools else None
                }
                
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=request_payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        # Fallback to simple generation if chat API fails
                        async for chunk in self._fallback_generate(session, message, context):
                            yield chunk
                        return
                    
                    # Process streaming response
                    async for line in response.content:
                        if line.strip():
                            try:
                                data = json.loads(line.decode('utf-8'))
                                
                                # Handle regular message content
                                if 'message' in data and 'content' in data['message']:
                                    content = data['message']['content']
                                    if content:
                                        yield AIChunk(
                                            content=content,
                                            timestamp=int(time.time() * 1000)
                                        ).dict()
                                
                                # Handle tool calls if present
                                if 'message' in data and 'tool_calls' in data['message']:
                                    tool_calls = data['message']['tool_calls']
                                    for tool_call in tool_calls:
                                        async for chunk in self._handle_tool_call(tool_call, context):
                                            yield chunk
                                
                                # Handle completion
                                if data.get('done', False):
                                    yield DoneChunk(
                                        timestamp=int(time.time() * 1000)
                                    ).dict()
                                    break
                                    
                            except json.JSONDecodeError:
                                continue
                            except Exception as e:
                                print(f"Error processing Ollama response: {e}")
                                continue
                                
        except Exception as e:
            print(f"Ollama provider error: {e}")
            yield ErrorChunk(
                error=f"Ollama API error: {str(e)}",
                timestamp=int(time.time() * 1000)
            ).dict()

    async def _fallback_generate(self, session: aiohttp.ClientSession, message: str, context: Optional[ChatContext] = None):
        """Fallback to simple generation API when chat API is not available."""
        try:
            # Prepare context-aware prompt
            full_prompt = self._prepare_prompt_with_context(message, context)
            
            request_payload = {
                "model": self.model,
                "prompt": full_prompt,
                "stream": True
            }
            
            async with session.post(
                f"{self.base_url}/api/generate",
                json=request_payload,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            ) as response:
                if response.status != 200:
                    raise Exception(f"Ollama generate API error: {response.status}")
                
                async for line in response.content:
                    if line.strip():
                        try:
                            data = json.loads(line.decode('utf-8'))
                            
                            if 'response' in data and data['response']:
                                yield AIChunk(
                                    content=data['response'],
                                    timestamp=int(time.time() * 1000)
                                ).dict()
                            
                            if data.get('done', False):
                                yield DoneChunk(
                                    timestamp=int(time.time() * 1000)
                                ).dict()
                                break
                                
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            print(f"Ollama fallback generate error: {e}")
            yield ErrorChunk(
                error=f"Ollama generation error: {str(e)}",
                timestamp=int(time.time() * 1000)
            ).dict()

    async def _handle_tool_call(self, tool_call: Dict, context: Optional[ChatContext] = None):
        """Handle tool calling with the same pattern as OpenAI provider."""
        try:
            tool_name = tool_call.get('function', {}).get('name')
            arguments = tool_call.get('function', {}).get('arguments', {})
            
            if isinstance(arguments, str):
                arguments = json.loads(arguments)
            
            # Execute tool
            tool_result = await get_tool_executor().execute_tool(
                tool_name,
                arguments,
                context=context
            )
            
            if tool_result["success"]:
                yield ToolResultChunk(
                    tool=tool_name,
                    result=tool_result["result"],
                    timestamp=int(time.time() * 1000)
                ).dict()
            else:
                yield ErrorChunk(
                    error=f"Tool execution failed: {tool_result.get('error', 'Unknown error')}",
                    timestamp=int(time.time() * 1000)
                ).dict()
                
        except Exception as e:
            yield ErrorChunk(
                error=f"Tool call error: {str(e)}",
                timestamp=int(time.time() * 1000)
            ).dict()

    async def generate_text(self, prompt: str) -> str:
        """Generate text using Ollama API (non-streaming)."""
        try:
            async with aiohttp.ClientSession() as session:
                request_payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False
                }
                
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=request_payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Ollama API error: {response.status}")
                    
                    data = await response.json()
                    content = data.get('response', '').strip()
                    
                    # Clean up any potential markdown formatting
                    if content.startswith('```') and content.endswith('```'):
                        lines = content.split('\n')
                        if len(lines) > 2:
                            content = '\n'.join(lines[1:-1])
                    
                    return content
                    
        except Exception as e:
            raise Exception(f"Ollama text generation error: {str(e)}")

    def _prepare_messages(
        self, 
        message: str, 
        context: Optional[ChatContext] = None
    ) -> list:
        """Prepare messages for Ollama API (similar to OpenAI format)."""
        print(f"DEBUG: Ollama _prepare_messages called with message: {message}")
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
            
            if context.file_path and context.code_content:
                context_parts.append(f"Current file: {context.file_path}")
                context_parts.append(f"Current code:\n```\n{context.code_content}\n```")
            
            if context.working_directory:
                context_parts.append(f"Working directory: {context.working_directory}")
            
            if context.referenced_files:
                context_parts.append("Referenced files:")
                for file_path, content in context.referenced_files.items():
                    context_parts.append(f"\n{file_path}:\n```\n{content}\n```")
            
            if context_parts:
                messages.append({
                    "role": "user",
                    "content": "\n\n".join(context_parts)
                })

        # Add the main user message
        messages.append({
            "role": "user", 
            "content": message
        })
        
        return messages

    def _prepare_prompt_with_context(self, message: str, context: Optional[ChatContext] = None) -> str:
        """Prepare a single prompt with context for fallback generation."""
        prompt_parts = []
        
        # Add system instructions
        prompt_parts.append("You are an AI coding assistant for Veltris Codex. You help with code generation, analysis, refactoring, and documentation.")
        
        # Add context if provided
        if context:
            if context.file_path and context.code_content:
                prompt_parts.append(f"\nCurrent file: {context.file_path}")
                prompt_parts.append(f"Current code:\n```\n{context.code_content}\n```")
            
            if context.working_directory:
                prompt_parts.append(f"\nWorking directory: {context.working_directory}")
            
            if context.referenced_files:
                prompt_parts.append("\nReferenced files:")
                for file_path, content in context.referenced_files.items():
                    prompt_parts.append(f"\n{file_path}:\n```\n{content}\n```")
        
        # Add the main message
        prompt_parts.append(f"\nUser request: {message}")
        
        return "\n".join(prompt_parts)

    def _convert_tools_to_ollama_format(self, tools: Dict) -> List[Dict]:
        """Convert OpenAI tool format to Ollama format."""
        ollama_tools = []
        for tool_name, tool_def in tools.items():
            ollama_tool = {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": tool_def.get("description", ""),
                    "parameters": tool_def.get("parameters", {})
                }
            }
            ollama_tools.append(ollama_tool)
        return ollama_tools

    async def check_health(self) -> bool:
        """Check if Ollama service is available."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception:
            return False


# Global instance - always create as Ollama doesn't require API keys
ollama_provider = OllamaProvider()