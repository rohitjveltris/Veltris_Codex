from typing import Any, Dict, Union

from pydantic import ValidationError

from src.models.tools import (
    CodeDiffParams,
    DocumentationParams,
    MultiDocumentationParams,
    CodeAnalysisParams,
    RefactorParams,
    GenerateCodeParams,
    FileModificationParams,
)
from src.services.tools.code_diff import code_diff_service
from src.services.tools.doc_generator import DocumentationService
from src.services.tools.code_analyzer import code_analyzer
from src.services.tools.refactor import code_refactor_service
from src.services.tools.file_system import list_directory, read_file, write_file
from src.services.tools.code_generator import CodeGeneratorService
from src.services.tools.file_modification import FileModificationService
from src.services.tools.smart_action_service import SmartCodeActionService
from src.services.tools.security_analyzer import security_analyzer
from src.services.tools.code_review_service import CodeReviewService


class ToolExecutionError(Exception):
    """Exception raised when tool execution fails."""
    pass


class ToolExecutor:
    """Service for executing AI tools."""

    def __init__(self, openai_provider: Any, claude_provider: Any):
        self.code_generator_service = CodeGeneratorService(openai_provider, claude_provider)
        self.file_modification_service = FileModificationService(openai_provider, claude_provider)
        self.smart_action_service = SmartCodeActionService(openai_provider, claude_provider)
        self.code_review_service = CodeReviewService(openai_provider, claude_provider)
        self.documentation_service = DocumentationService(openai_provider, claude_provider)
        self.tools = {
            "generate_code_diff": self._execute_code_diff,
            "generate_documentation": self._execute_documentation,
            "generate_multiple_documentation": self._execute_multiple_documentation,
            "analyze_code_structure": self._execute_code_analysis,
            "refactor_code": self._execute_refactor,
            "list_directory": self._execute_list_directory,
            "read_file": self._execute_read_file,
            "write_file": self._execute_write_file,
            "generate_code": self._execute_generate_code,
            "modify_file_with_diff": self._execute_file_modification,
            "smart_code_action": self._execute_smart_code_action,
            "security_analysis": self._execute_security_analysis,
            "comprehensive_code_review": self._execute_comprehensive_code_review,
        }

    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a tool with given parameters."""
        if tool_name not in self.tools:
            raise ToolExecutionError(f"Unknown tool: {tool_name}")

        try:
            # Add working_directory to parameters if it exists in the context
            if context and context.working_directory:
                parameters['working_directory'] = context.working_directory
                print(f"DEBUG: Working directory in tool executor: {context.working_directory}")

            tool_func = self.tools[tool_name]
            result = await tool_func(parameters)
            
            return {
                "success": True,
                "result": result,
                "tool_name": tool_name
            }
        except ValidationError as e:
            raise ToolExecutionError(f"Parameter validation failed: {e}")
        except Exception as e:
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")

    async def _execute_code_diff(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code diff tool."""
        try:
            params = CodeDiffParams(**parameters)
            result = await code_diff_service.generate_diff(params)
            return result.dict()
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for code diff: {e}")

    async def _execute_documentation(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute documentation generation tool."""
        try:
            params = DocumentationParams(**parameters)
            result = await self.documentation_service.generate_documentation(params)
            return result.dict()
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for documentation: {e}")

    async def _execute_multiple_documentation(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute multiple documentation generation tool."""
        try:
            print(f"DEBUG: Executing multiple documentation with parameters: {parameters}")
            working_directory = parameters.pop('working_directory', None)
            params = MultiDocumentationParams(**parameters)
            results = await self.documentation_service.generate_multiple_documentation(params, working_directory)
            return {"results": results}
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for multiple documentation: {e}")

    async def _execute_code_analysis(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code analysis tool."""
        try:
            params = CodeAnalysisParams(**parameters)
            result = await code_analyzer.analyze_code(params)
            return result.dict()
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for code analysis: {e}")

    async def _execute_refactor(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code refactoring tool."""
        try:
            params = RefactorParams(**parameters)
            result = await code_refactor_service.refactor_code(params)
            return result.dict()
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for refactoring: {e}")

    async def _execute_list_directory(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute list directory tool."""
        try:
            return await list_directory(parameters.get('path', '.'))
        except Exception as e:
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")

    async def _execute_read_file(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute read file tool."""
        try:
            return await read_file(parameters.get('absolute_path'), parameters.get('base_path'))
        except Exception as e:
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")

    async def _execute_write_file(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute write file tool."""
        print(f"DEBUG: Executing write_file with parameters: {parameters}")
        try:
            return await write_file(parameters.get('file_path'), parameters.get('content'), parameters.get('base_path'))
        except Exception as e:
            print(f"DEBUG: Error in _execute_write_file: {e}")
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")

    async def _execute_generate_code(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute generate code tool."""
        print(f"DEBUG: Executing generate_code with parameters: {parameters}")
        try:
            working_directory = parameters.pop('working_directory', None)
            params = GenerateCodeParams(**parameters)
            result = await self.code_generator_service.generate_code(params, working_directory)
            return result
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for code generation: {e}")
        except Exception as e:
            print(f"DEBUG: Error in _execute_generate_code: {e}")
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")

    async def _execute_file_modification(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute file modification with diff tool."""
        try:
            params = FileModificationParams(**parameters)
            result = await self.file_modification_service.modify_file_with_diff(params)
            return result.dict()
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for file modification: {e}")
        except Exception as e:
            raise ToolExecutionError(f"File modification failed: {str(e)}")

    async def _execute_smart_code_action(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute smart code action."""
        try:
            result = await self.smart_action_service.perform_smart_action(parameters)
            return result
        except Exception as e:
            raise ToolExecutionError(f"Smart code action failed: {str(e)}")

    async def _execute_security_analysis(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute security analysis."""
        try:
            params = CodeAnalysisParams(**parameters)
            result = await security_analyzer.analyze_security(params)
            return {
                "success": True,
                "issues": [
                    {
                        "severity": issue.severity,
                        "category": issue.category,
                        "description": issue.description,
                        "line_number": issue.line_number,
                        "code_snippet": issue.code_snippet,
                        "recommendation": issue.recommendation,
                        "cwe_id": issue.cwe_id
                    } for issue in result.issues
                ],
                "security_score": result.security_score,
                "summary": result.summary,
                "recommendations": result.recommendations
            }
        except ValidationError as e:
            raise ToolExecutionError(f"Invalid parameters for security analysis: {e}")
        except Exception as e:
            raise ToolExecutionError(f"Security analysis failed: {str(e)}")

    async def _execute_comprehensive_code_review(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute comprehensive code review."""
        try:
            result = await self.code_review_service.perform_comprehensive_review(parameters)
            return result
        except Exception as e:
            raise ToolExecutionError(f"Code review failed: {str(e)}")

    def get_available_tools(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available tools with their schemas."""
        return {
            "generate_code_diff": {
                "name": "generate_code_diff",
                "description": "Generate and display code differences",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "old_code": {
                            "type": "string",
                            "description": "Original version of the code"
                        },
                        "new_code": {
                            "type": "string",
                            "description": "Updated version of the code"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language (optional)"
                        }
                    },
                    "required": ["old_code", "new_code"]
                }
            },
            "generate_documentation": {
                "name": "generate_documentation",
                "description": "Generate technical documentation like BRD, SRD, or README",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doc_type": {
                            "type": "string",
                            "enum": ["BRD", "SRD", "README", "API_DOCS"],
                            "description": "Type of documentation to generate"
                        },
                        "project_context": {
                            "type": "string",
                            "description": "Project-level description, user goal, or business purpose"
                        },
                        "code_structure": {
                            "type": "string",
                            "description": "Description of file structure or key components (optional)"
                        }
                    },
                    "required": ["doc_type", "project_context"]
                }
            },
            "generate_multiple_documentation": {
                "name": "generate_multiple_documentation",
                "description": "Generate multiple types of technical documentation (BRD, SRD, README, API_DOCS) in one request",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doc_types": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["BRD", "SRD", "README", "API_DOCS"]
                            },
                            "description": "List of documentation types to generate"
                        },
                        "project_context": {
                            "type": "string",
                            "description": "Project-level description, user goal, or business purpose"
                        },
                        "code_structure": {
                            "type": "string",
                            "description": "Description of file structure or key components (optional)"
                        }
                    },
                    "required": ["doc_types", "project_context"]
                }
            },
            "analyze_code_structure": {
                "name": "analyze_code_structure",
                "description": "Analyze a file or project to detect patterns and structure",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Relative file path"
                        },
                        "code_content": {
                            "type": "string",
                            "description": "Source code to analyze"
                        }
                    },
                    "required": ["file_path", "code_content"]
                }
            },
            "refactor_code": {
                "name": "refactor_code",
                "description": "Refactor code with a specific strategy",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "original_code": {
                            "type": "string",
                            "description": "The source code to be refactored"
                        },
                        "refactor_type": {
                            "type": "string",
                            "enum": ["optimize", "modernize", "add_types", "extract_components"],
                            "description": "The type of refactoring to apply"
                        }
                    },
                    "required": ["original_code", "refactor_type"]
                }
            },
            "write_file": {
                "name": "write_file",
                "description": "Writes content to a specified file.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The path to the file to write (relative to project root)"
                        },
                        "content": {
                            "type": "string",
                            "description": "The content to write to the file"
                        }
                    },
                    "required": ["file_path", "content"]
                }
            },
            "generate_code": {
                "name": "generate_code",
                "description": "Generates code for multiple files based on a list of prompts and saves them to specified file paths.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "items": {
                            "type": "array",
                            "description": "A list of code generation requests.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "prompt": {
                                        "type": "string",
                                        "description": "Natural language description of the code to generate for this item"
                                    },
                                    "file_path": {
                                        "type": "string",
                                        "description": "The specific file path (relative to project root) where this code should be saved"
                                    },
                                    "language": {
                                        "type": "string",
                                        "description": "Programming language for this code item (e.g., python, javascript, typescript)"
                                    }
                                },
                                "required": ["prompt", "file_path"]
                            }
                        }
                    },
                    "required": ["items"]
                }
            },
            "modify_file_with_diff": {
                "name": "modify_file_with_diff",
                "description": "Modify an existing file with AI assistance and generate a diff for user approval. Use this when the user wants to make changes to a specific file.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to modify (relative to project root)"
                        },
                        "modification_request": {
                            "type": "string",
                            "description": "Description of the changes to make to the file"
                        },
                        "current_content": {
                            "type": "string",
                            "description": "Current file content (optional, will be auto-fetched if not provided)"
                        }
                    },
                    "required": ["file_path", "modification_request"]
                }
            },
            "smart_code_action": {
                "name": "smart_code_action",
                "description": "Perform intelligent code improvements based on natural language requests. Can optimize code, add type hints, modernize syntax, add error handling, etc.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to improve"
                        },
                        "action_request": {
                            "type": "string", 
                            "description": "Natural language description of the improvement to make (e.g., 'optimize for performance', 'add type hints', 'add error handling')"
                        },
                        "file_content": {
                            "type": "string",
                            "description": "Current file content (optional, will be auto-fetched if not provided)"
                        }
                    },
                    "required": ["file_path", "action_request"]
                }
            },
            "security_analysis": {
                "name": "security_analysis",
                "description": "Perform comprehensive security analysis to find vulnerabilities, weak cryptography, and security issues",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to analyze for security issues"
                        },
                        "code_content": {
                            "type": "string",
                            "description": "Source code to analyze for security vulnerabilities"
                        }
                    },
                    "required": ["file_path", "code_content"]
                }
            },
            "comprehensive_code_review": {
                "name": "comprehensive_code_review", 
                "description": "Perform a comprehensive code review combining security analysis, code quality metrics, and AI insights",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to review"
                        },
                        "file_content": {
                            "type": "string",
                            "description": "Source code content (optional, will be auto-fetched if not provided)"
                        },
                        "review_focus": {
                            "type": "string",
                            "enum": ["all", "security", "performance", "maintainability", "style"],
                            "description": "Focus area for the review (default: all)"
                        }
                    },
                    "required": ["file_path"]
                }
            }
        }


# Global tool executor instance will be set in main.py
tool_executor = None

def get_tool_executor():
    """Get the global tool executor instance."""
    if tool_executor is None:
        raise RuntimeError("Tool executor not initialized. Call set_tool_executor() first.")
    return tool_executor