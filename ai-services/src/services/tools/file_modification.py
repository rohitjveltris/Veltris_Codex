"""File modification service with diff generation."""
from typing import Any

from src.models.tools import FileModificationParams, FileModificationResult
from src.services.tools.file_system import read_file
from src.services.tools.code_diff import code_diff_service


class FileModificationService:
    """Service for modifying files with AI assistance and diff generation."""

    def __init__(self, openai_provider: Any, claude_provider: Any):
        self.openai_provider = openai_provider
        self.claude_provider = claude_provider

    async def modify_file_with_diff(self, params: FileModificationParams) -> FileModificationResult:
        """Modify a file and generate diff for approval."""
        
        # Get current file content if not provided
        if params.current_content is None:
            file_content_result = await read_file(params.file_path)
            if "error" in file_content_result.get("content", "").lower():
                raise ValueError(f"Could not read file {params.file_path}: {file_content_result['content']}")
            current_content = file_content_result["content"]
        else:
            current_content = params.current_content

        # Determine which AI provider to use
        provider = None
        if self.openai_provider:
            provider = self.openai_provider
        elif self.claude_provider:
            provider = self.claude_provider
        
        if not provider:
            raise ValueError("No AI provider available for file modification")

        # Create prompt for AI to modify the code
        modification_prompt = f"""
Please modify the following code according to this request: {params.modification_request}

Current code:
```
{current_content}
```

Requirements:
- Make only the necessary changes requested
- Maintain the existing code structure and style
- Return ONLY the complete modified code
- Do not include explanations or markdown formatting
- Ensure the code remains functional and syntactically correct
"""

        # Generate modified content using AI
        try:
            modified_content = await provider.generate_text(modification_prompt)
        except Exception as e:
            raise ValueError(f"AI modification failed: {str(e)}")

        # Generate diff between original and modified content
        from src.models.tools import CodeDiffParams
        diff_params = CodeDiffParams(
            old_code=current_content,
            new_code=modified_content,
            language=self._detect_language(params.file_path)
        )
        
        diff_result = await code_diff_service.generate_diff(diff_params)

        # Create modification summary
        summary = self._create_modification_summary(diff_result, params.modification_request)

        return FileModificationResult(
            file_path=params.file_path,
            original_content=current_content,
            modified_content=modified_content,
            diff=diff_result,
            modification_summary=summary
        )

    def _detect_language(self, file_path: str) -> str:
        """Detect programming language from file extension."""
        extension_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.jsx': 'javascript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.cs': 'csharp',
            '.kt': 'kotlin',
            '.swift': 'swift',
            '.md': 'markdown',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml'
        }
        
        # Get file extension
        import os
        _, ext = os.path.splitext(file_path.lower())
        return extension_map.get(ext, 'text')

    def _create_modification_summary(self, diff_result, modification_request: str) -> str:
        """Create a human-readable summary of the modifications."""
        summary = diff_result.summary
        
        changes = []
        if summary.lines_added > 0:
            changes.append(f"{summary.lines_added} lines added")
        if summary.lines_removed > 0:
            changes.append(f"{summary.lines_removed} lines removed")
        if summary.lines_changed > 0:
            changes.append(f"{summary.lines_changed} lines modified")
        
        if not changes:
            return "No changes detected"
        
        change_text = ", ".join(changes)
        return f"Applied changes: {modification_request}. Summary: {change_text}."


# Global service instance will be set in tool_executor.py
file_modification_service = None