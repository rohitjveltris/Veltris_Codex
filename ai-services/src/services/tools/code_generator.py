from typing import Optional, List, Dict, Any

from src.models.tools import GenerateCodeParams
from src.services.tools.file_system import write_file

class CodeGeneratorService:
    def __init__(self, openai_provider: Any, claude_provider: Any):
        self.openai_provider = openai_provider
        self.claude_provider = claude_provider

    async def generate_code(self, params: GenerateCodeParams, working_directory: str = None) -> List[Dict[str, Any]]:
        results = []
        for item in params.items:
            # Determine which AI provider to use (default to OpenAI if available)
            provider = None
            if self.openai_provider:
                provider = self.openai_provider
            elif self.claude_provider:
                provider = self.claude_provider
            
            if not provider:
                results.append({
                    "file_path": item.file_path,
                    "success": False,
                    "message": "No AI provider configured or available for code generation."
                })
                continue

            # Generate code using the AI provider (simple text generation, not tool calling)
            try:
                # Create a focused prompt for the specific file
                language_part = f" {item.language}" if item.language else ""
                code_generation_prompt = f"""Generate a complete and runnable {item.language or ''} script for the following prompt: {item.prompt}

CRITICAL REQUIREMENTS:
- The script should be fully executable.
- The script MUST print its result to the console.
- Do NOT include any markdown formatting, explanations, or comments.
"""
                
                # Generate the code using the provider's enhanced generate_text method
                generated_code = await provider.generate_text(code_generation_prompt)

                write_result = await write_file(item.file_path, generated_code, working_directory)
                results.append({
                    "file_path": item.file_path,
                    "success": write_result["success"],
                    "message": write_result["message"],
                    "code": generated_code if not write_result["success"] else None # Include code if not saved
                })
            except Exception as e:
                results.append({
                    "file_path": item.file_path,
                    "success": False,
                    "message": f"AI code generation failed: {str(e)}"
                })
        return results