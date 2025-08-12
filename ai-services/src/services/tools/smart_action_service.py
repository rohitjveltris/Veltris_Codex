"""Smart code action service using AI to determine best improvements."""
import json
from typing import Any, Dict, List, Optional

from src.models.tools import (
    RefactorParams,
    RefactorType,
    CodeAnalysisParams,
    FileModificationParams
)
from src.services.tools.code_analyzer import code_analyzer
from src.services.tools.refactor import code_refactor_service
from src.services.tools.file_system import read_file
from src.services.tools.file_modification import FileModificationService


class SmartCodeActionService:
    """AI-powered service for smart code actions."""

    def __init__(self, openai_provider: Any, claude_provider: Any):
        self.openai_provider = openai_provider
        self.claude_provider = claude_provider
        self.file_modification_service = FileModificationService(openai_provider, claude_provider)

    async def perform_smart_action(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform smart code action based on natural language request."""
        file_path = params.get("file_path")
        action_request = params.get("action_request")
        file_content = params.get("file_content")
        
        if not file_path or not action_request:
            raise ValueError("file_path and action_request are required")
        
        # Read file content if not provided
        if not file_content:
            file_data = await read_file(file_path)
            if not file_data.get("content"):
                raise ValueError(f"Could not read file: {file_path}")
            file_content = file_data["content"]
        
        # Analyze the code to understand its structure and current state
        analysis_result = await code_analyzer.analyze_code(
            CodeAnalysisParams(file_path=file_path, code_content=file_content)
        )
        
        # Determine the best action strategy using AI
        action_strategy = await self._determine_action_strategy(
            action_request, file_content, analysis_result, file_path
        )
        
        # Execute the determined strategy
        result = await self._execute_action_strategy(
            action_strategy, file_path, file_content, analysis_result
        )
        
        return {
            "success": True,
            "file_path": file_path,
            "action_request": action_request,
            "strategy_used": action_strategy,
            "analysis": analysis_result.dict(),
            "result": result
        }

    async def _determine_action_strategy(
        self, 
        action_request: str, 
        file_content: str, 
        analysis_result: Any,
        file_path: str
    ) -> Dict[str, Any]:
        """Use AI to determine the best strategy for the requested action."""
        
        # Create a comprehensive prompt for the AI to analyze the request
        prompt = f"""You are a code improvement expert. Analyze this code action request and determine the best strategy.

FILE: {file_path}
ACTION REQUEST: {action_request}

CURRENT CODE ANALYSIS:
- Lines of Code: {analysis_result.metrics.lines_of_code}
- Complexity: {analysis_result.metrics.complexity}
- Maintainability Score: {analysis_result.metrics.maintainability_score}
- Functions: {', '.join(analysis_result.structure.functions)}
- Classes: {', '.join(analysis_result.structure.classes)}
- Detected Patterns: {', '.join(analysis_result.patterns)}
- Current Suggestions: {', '.join(analysis_result.suggestions)}

CODE CONTENT:
```
{file_content[:2000]}...
```

Based on the request, determine the best strategy and respond with a JSON object containing:
{{
    "strategy_type": "refactor|modify|analyze|security|documentation",
    "refactor_type": "optimize|modernize|add_types|extract_components|null",
    "specific_actions": ["action1", "action2", ...],
    "priority": "high|medium|low",
    "reasoning": "explanation of why this strategy was chosen",
    "estimated_changes": "brief description of expected changes"
}}

Common action patterns:
- "optimize" requests → strategy_type: "refactor", refactor_type: "optimize"
- "add types/type hints" → strategy_type: "refactor", refactor_type: "add_types" 
- "modernize/convert to" → strategy_type: "refactor", refactor_type: "modernize"
- "add error handling" → strategy_type: "modify", specific_actions: ["add_try_catch", "add_validation"]
- "add docstrings/documentation" → strategy_type: "documentation", specific_actions: ["add_docstrings"]
- "security review/find bugs" → strategy_type: "security", specific_actions: ["security_scan", "vulnerability_check"]
- "improve readability" → strategy_type: "refactor", refactor_type: "extract_components"
"""

        try:
            # Use OpenAI for strategy determination (faster for analysis tasks)
            response = await self.openai_provider.generate_text(prompt)
            
            # Extract JSON from response
            response_clean = response.strip()
            if response_clean.startswith('```json'):
                response_clean = response_clean[7:]
            if response_clean.endswith('```'):
                response_clean = response_clean[:-3]
            
            strategy = json.loads(response_clean)
            return strategy
            
        except Exception as e:
            # Fallback to rule-based strategy determination
            return self._fallback_strategy_determination(action_request, analysis_result)

    def _fallback_strategy_determination(self, action_request: str, analysis_result: Any) -> Dict[str, Any]:
        """Fallback rule-based strategy determination."""
        action_lower = action_request.lower()
        
        if any(word in action_lower for word in ["optimize", "performance", "faster"]):
            return {
                "strategy_type": "refactor",
                "refactor_type": "optimize",
                "specific_actions": ["remove_console_logs", "optimize_loops", "use_templates"],
                "priority": "high",
                "reasoning": "Request contains optimization keywords",
                "estimated_changes": "Performance improvements and code cleanup"
            }
        elif any(word in action_lower for word in ["type", "hint", "annotation"]):
            return {
                "strategy_type": "refactor", 
                "refactor_type": "add_types",
                "specific_actions": ["add_type_hints", "add_interfaces"],
                "priority": "medium",
                "reasoning": "Request contains typing keywords",
                "estimated_changes": "Add type annotations for better code clarity"
            }
        elif any(word in action_lower for word in ["modern", "convert", "upgrade", "async", "await"]):
            return {
                "strategy_type": "refactor",
                "refactor_type": "modernize", 
                "specific_actions": ["modernize_syntax", "convert_async"],
                "priority": "medium",
                "reasoning": "Request contains modernization keywords",
                "estimated_changes": "Update to modern language features"
            }
        elif any(word in action_lower for word in ["error", "handling", "exception", "try", "catch"]):
            return {
                "strategy_type": "modify",
                "refactor_type": None,
                "specific_actions": ["add_error_handling", "add_validation"],
                "priority": "high", 
                "reasoning": "Request involves error handling improvements",
                "estimated_changes": "Add comprehensive error handling and validation"
            }
        elif any(word in action_lower for word in ["doc", "comment", "docstring"]):
            return {
                "strategy_type": "documentation",
                "refactor_type": None,
                "specific_actions": ["add_docstrings", "add_comments"],
                "priority": "medium",
                "reasoning": "Request involves documentation improvements", 
                "estimated_changes": "Add documentation and comments"
            }
        elif any(word in action_lower for word in ["security", "bug", "vulnerability", "safe"]):
            return {
                "strategy_type": "security",
                "refactor_type": None,
                "specific_actions": ["security_scan", "bug_detection"],
                "priority": "high",
                "reasoning": "Request involves security or bug analysis",
                "estimated_changes": "Security analysis and bug detection"
            }
        else:
            return {
                "strategy_type": "analyze",
                "refactor_type": None,
                "specific_actions": ["general_analysis"],
                "priority": "medium", 
                "reasoning": "General code improvement request",
                "estimated_changes": "General code analysis and suggestions"
            }

    async def _execute_action_strategy(
        self,
        strategy: Dict[str, Any], 
        file_path: str,
        file_content: str,
        analysis_result: Any
    ) -> Dict[str, Any]:
        """Execute the determined action strategy."""
        strategy_type = strategy.get("strategy_type")
        
        if strategy_type == "refactor":
            return await self._execute_refactor_strategy(strategy, file_content)
        elif strategy_type == "modify":
            return await self._execute_modify_strategy(strategy, file_path, file_content)
        elif strategy_type == "documentation":
            return await self._execute_documentation_strategy(strategy, file_path, file_content)
        elif strategy_type == "security":
            return await self._execute_security_strategy(strategy, file_content, analysis_result)
        else:
            return await self._execute_analysis_strategy(strategy, analysis_result)

    async def _execute_refactor_strategy(self, strategy: Dict[str, Any], file_content: str) -> Dict[str, Any]:
        """Execute refactoring strategy using existing refactor service."""
        refactor_type_str = strategy.get("refactor_type")
        
        if refactor_type_str == "optimize":
            refactor_type = RefactorType.OPTIMIZE
        elif refactor_type_str == "modernize":
            refactor_type = RefactorType.MODERNIZE
        elif refactor_type_str == "add_types":
            refactor_type = RefactorType.ADD_TYPES
        elif refactor_type_str == "extract_components":
            refactor_type = RefactorType.EXTRACT_COMPONENTS
        else:
            refactor_type = RefactorType.OPTIMIZE  # Default
            
        refactor_result = await code_refactor_service.refactor_code(
            RefactorParams(original_code=file_content, refactor_type=refactor_type)
        )
        
        return {
            "type": "refactor",
            "refactored_code": refactor_result.refactored_code,
            "changes": [change.dict() for change in refactor_result.changes],
            "improvements": refactor_result.improvements,
            "refactor_type": refactor_result.refactor_type
        }

    async def _execute_modify_strategy(self, strategy: Dict[str, Any], file_path: str, file_content: str) -> Dict[str, Any]:
        """Execute modification strategy using AI-powered file modification."""
        specific_actions = strategy.get("specific_actions", [])
        modification_request = f"Apply the following improvements: {', '.join(specific_actions)}"
        
        result = await self.file_modification_service.modify_file_with_diff(
            FileModificationParams(
                file_path=file_path,
                modification_request=modification_request,
                current_content=file_content
            )
        )
        
        return {
            "type": "modify",
            "original_content": result.original_content,
            "modified_content": result.modified_content,
            "diff": result.diff.dict(),
            "summary": result.modification_summary
        }

    async def _execute_documentation_strategy(self, strategy: Dict[str, Any], file_path: str, file_content: str) -> Dict[str, Any]:
        """Execute documentation strategy."""
        specific_actions = strategy.get("specific_actions", [])
        
        if "add_docstrings" in specific_actions:
            # Use file modification service to add docstrings
            result = await self.file_modification_service.modify_file_with_diff(
                FileModificationParams(
                    file_path=file_path,
                    modification_request="Add comprehensive docstrings to all functions and classes. Follow standard docstring conventions for the detected language.",
                    current_content=file_content
                )
            )
            
            return {
                "type": "documentation",
                "original_content": result.original_content,
                "modified_content": result.modified_content,
                "diff": result.diff.dict(),
                "summary": result.modification_summary
            }
        else:
            return {
                "type": "documentation",
                "suggestions": [
                    "Add docstrings to functions and classes",
                    "Include type hints in documentation",
                    "Add inline comments for complex logic",
                    "Consider adding README section for this module"
                ]
            }

    async def _execute_security_strategy(self, strategy: Dict[str, Any], file_content: str, analysis_result: Any) -> Dict[str, Any]:
        """Execute security analysis strategy."""
        # This will be enhanced when we create the security analyzer
        security_issues = []
        
        # Basic security checks
        if "password" in file_content.lower() and "plain" in file_content.lower():
            security_issues.append("Potential plaintext password detected")
        
        if "eval(" in file_content:
            security_issues.append("Use of eval() detected - potential code injection risk")
        
        if "sql" in file_content.lower() and "%" in file_content:
            security_issues.append("Potential SQL injection risk with string formatting")
        
        if "open(" in file_content and "w" in file_content:
            security_issues.append("File write operations detected - ensure proper validation")
            
        return {
            "type": "security",
            "security_issues": security_issues,
            "suggestions": [
                "Use parameterized queries for database operations",
                "Validate all user inputs",
                "Use secure password hashing (bcrypt, scrypt, etc.)",
                "Implement proper error handling without information leakage",
                "Add input sanitization for file operations"
            ],
            "severity": "high" if security_issues else "low"
        }

    async def _execute_analysis_strategy(self, strategy: Dict[str, Any], analysis_result: Any) -> Dict[str, Any]:
        """Execute general analysis strategy."""
        return {
            "type": "analysis",
            "structure": analysis_result.structure.dict(),
            "metrics": analysis_result.metrics.dict(),
            "suggestions": analysis_result.suggestions,
            "patterns": analysis_result.patterns,
            "recommendations": [
                f"Current maintainability score: {analysis_result.metrics.maintainability_score}/100",
                f"Code complexity: {analysis_result.metrics.complexity}",
                "Consider the suggestions above for improvements"
            ]
        }


# Global service instance will be created in tool_executor.py