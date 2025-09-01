"""Tool-related models."""
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class DocType(str, Enum):
    """Documentation types."""
    BRD = "BRD"
    SRD = "SRD"
    README = "README"
    API_DOCS = "API_DOCS"


class RefactorType(str, Enum):
    """Code refactoring types."""
    OPTIMIZE = "optimize"
    MODERNIZE = "modernize"
    ADD_TYPES = "add_types"
    EXTRACT_COMPONENTS = "extract_components"


# Tool Parameter Models
class CodeDiffParams(BaseModel):
    """Parameters for code diff generation."""
    old_code: str = Field(..., description="Original version of the code")
    new_code: str = Field(..., description="Updated version of the code")
    language: Optional[str] = Field(default=None, description="Programming language")


class DocumentationParams(BaseModel):
    """Parameters for documentation generation."""
    doc_type: DocType = Field(..., description="Type of documentation to generate")
    project_context: str = Field(..., description="Project context and description")
    code_structure: Optional[str] = Field(default=None, description="Code structure info")


class MultiDocumentationParams(BaseModel):
    """Parameters for multiple documentation generation."""
    doc_types: List[DocType] = Field(..., min_items=1, description="Types of documentation to generate")
    project_context: str = Field(..., description="Project context and description")
    code_structure: Optional[str] = Field(default=None, description="Code structure info")


class CodeAnalysisParams(BaseModel):
    """Parameters for code analysis."""
    file_path: str = Field(..., description="File path being analyzed")
    code_content: str = Field(..., description="Code content to analyze")


class RefactorParams(BaseModel):
    """Parameters for code refactoring."""
    original_code: str = Field(..., description="Original code to refactor")
    refactor_type: RefactorType = Field(..., description="Type of refactoring")


class FileModificationParams(BaseModel):
    """Parameters for file modification with diff preview."""
    file_path: str = Field(..., description="Path to the file to modify")
    modification_request: str = Field(..., description="Description of the changes to make")
    current_content: Optional[str] = Field(default=None, description="Current file content (auto-fetched if not provided)")


class GenerateCodeParams(BaseModel):
    """Parameters for code generation."""
    prompt: str = Field(..., description="Natural language description of the code to generate")
    file_path: Optional[str] = Field(default=None, description="Suggested file path for the generated code")
    language: Optional[str] = Field(default=None, description="Programming language of the code to generate")


class CodeGenerationItem(BaseModel):
    """Represents a single code generation request within a multi-file operation."""
    prompt: str = Field(..., description="Natural language description of the code to generate for this item")
    file_path: str = Field(..., description="The specific file path (relative to project root) where this code should be saved")
    language: Optional[str] = Field(default=None, description="Programming language for this code item")


class GenerateCodeParams(BaseModel):
    """Parameters for multi-file code generation."""
    items: List[CodeGenerationItem] = Field(..., description="A list of code generation requests, each specifying a prompt, file path, and optional language.")


# Tool Result Models
class DiffLine(BaseModel):
    """Single diff line."""
    type: str = Field(..., description="Change type: added, removed, unchanged")
    content: str = Field(..., description="Line content")
    line_number: int = Field(..., description="Line number")


class DiffSummary(BaseModel):
    """Diff summary statistics."""
    lines_added: int = Field(..., description="Number of added lines")
    lines_removed: int = Field(..., description="Number of removed lines")
    lines_changed: int = Field(..., description="Number of changed lines")


class CodeDiffResult(BaseModel):
    """Code diff result."""
    diffs: List[DiffLine] = Field(..., description="Line-by-line differences")
    summary: DiffSummary = Field(..., description="Diff summary")


class DocumentationResult(BaseModel):
    """Documentation generation result."""
    content: str = Field(..., description="Generated documentation content")
    doc_type: str = Field(..., description="Documentation type")
    sections: List[str] = Field(..., description="Documentation sections")
    word_count: int = Field(..., description="Word count")


class FileModificationResult(BaseModel):
    """File modification result with diff."""
    file_path: str = Field(..., description="Path to the modified file")
    original_content: str = Field(..., description="Original file content")
    modified_content: str = Field(..., description="Modified file content")
    diff: CodeDiffResult = Field(..., description="Diff between original and modified content")
    modification_summary: str = Field(..., description="Summary of changes made")


class CodeStructure(BaseModel):
    """Code structure analysis."""
    functions: List[str] = Field(..., description="Found functions")
    classes: List[str] = Field(..., description="Found classes")
    imports: List[str] = Field(..., description="Found imports")
    exports: List[str] = Field(..., description="Found exports")


class CodeMetrics(BaseModel):
    """Code quality metrics."""
    lines_of_code: int = Field(..., description="Lines of code")
    complexity: int = Field(..., description="Cyclomatic complexity")
    maintainability_score: float = Field(..., description="Maintainability score")


class CodeAnalysisResult(BaseModel):
    """Code analysis result."""
    structure: CodeStructure = Field(..., description="Code structure")
    metrics: CodeMetrics = Field(..., description="Code metrics")
    suggestions: List[str] = Field(..., description="Improvement suggestions")
    patterns: List[str] = Field(..., description="Detected patterns")


class RefactorChange(BaseModel):
    """Single refactor change."""
    type: str = Field(..., description="Change type")
    description: str = Field(..., description="Change description")
    line_number: int = Field(..., description="Line number")


class RefactorResult(BaseModel):
    """Code refactoring result."""
    refactored_code: str = Field(..., description="Refactored code")
    changes: List[RefactorChange] = Field(..., description="Applied changes")
    improvements: List[str] = Field(..., description="Improvements made")
    refactor_type: str = Field(..., description="Type of refactoring applied")


# Test Generation Models
class TestGenerationParams(BaseModel):
    """Parameters for test generation."""
    file_path: str = Field(..., description="File path to generate tests for")
    code_content: str = Field(..., description="Code content to analyze")
    test_types: Optional[List[str]] = Field(default=['unit'], description="Types of tests to generate")
    framework: str = Field(default='auto', description="Testing framework to use")
    coverage_target: float = Field(default=85.0, description="Target code coverage percentage")
    mock_external: bool = Field(default=True, description="Whether to mock external dependencies")
    include_edge_cases: bool = Field(default=True, description="Whether to include edge case tests")
    max_tests_per_function: int = Field(default=8, description="Maximum tests per function")


class TestCase(BaseModel):
    """Individual test case."""
    name: str = Field(..., description="Test case name")
    description: str = Field(..., description="Test case description")
    test_code: str = Field(..., description="Generated test code")
    test_type: str = Field(..., description="Type of test (unit, integration, e2e)")
    complexity_score: float = Field(..., description="Test complexity score")


class MockData(BaseModel):
    """Mock data for testing."""
    name: str = Field(..., description="Mock data name")
    type: str = Field(..., description="Mock data type")
    sample_data: dict = Field(..., description="Sample mock data")
    schema: Optional[dict] = Field(default=None, description="Data schema")


class TestSuite(BaseModel):
    """Complete test suite for a file."""
    file_path: str = Field(..., description="Original source file path")
    test_file_path: str = Field(..., description="Generated test file path")
    framework: str = Field(..., description="Testing framework used")
    language: str = Field(..., description="Programming language")
    test_cases: List[TestCase] = Field(..., description="Generated test cases")
    mock_data: List[MockData] = Field(..., description="Mock data used in tests")
    setup_code: str = Field(..., description="Test setup code")
    teardown_code: str = Field(..., description="Test teardown code")
    imports: List[str] = Field(..., description="Required imports")
    coverage_estimate: float = Field(..., description="Estimated code coverage")
    quality_score: float = Field(..., description="Test quality score")


class TestabilityAnalysis(BaseModel):
    """Analysis of code testability."""
    file_path: str = Field(..., description="File path analyzed")
    testability_score: float = Field(..., description="Testability score (0-10)")
    testable_functions: List[str] = Field(..., description="Functions that can be tested")
    complex_functions: List[str] = Field(..., description="Complex functions needing attention")
    dependencies: List[str] = Field(..., description="External dependencies")
    existing_tests: List[str] = Field(..., description="Existing test functions found")
    coverage_gaps: List[str] = Field(..., description="Functions without test coverage")
    recommendations: List[str] = Field(..., description="Testability improvement recommendations")


class BatchTestGenerationParams(BaseModel):
    """Parameters for batch test generation."""
    file_paths: List[str] = Field(..., description="List of file paths to generate tests for")
    base_params: TestGenerationParams = Field(..., description="Base test generation parameters")


class TestDataFactoryParams(BaseModel):
    """Parameters for test data factory generation."""
    schema: dict = Field(..., description="Data schema definition")
    language: str = Field(default="typescript", description="Target language for factory")
    factory_name: str = Field(default="TestDataFactory", description="Factory class name")


class CoverageAnalysisResult(BaseModel):
    """Test coverage analysis result."""
    file_path: str = Field(..., description="File path analyzed")
    current_coverage: float = Field(..., description="Current test coverage percentage")
    uncovered_lines: List[int] = Field(..., description="Line numbers without coverage")
    uncovered_functions: List[str] = Field(..., description="Functions without test coverage")
    suggested_tests: List[str] = Field(..., description="Suggested tests to improve coverage")
    coverage_report: dict = Field(..., description="Detailed coverage report")