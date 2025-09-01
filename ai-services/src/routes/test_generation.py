"""Test generation API routes."""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any

from src.models.tools import (
    TestGenerationParams,
    TestSuite,
    TestabilityAnalysis,
    BatchTestGenerationParams,
    TestDataFactoryParams,
    CoverageAnalysisResult,
)
from src.services.tools.test_generator import test_generator

router = APIRouter(prefix="/test-generation", tags=["test-generation"])


@router.post("/analyze-testability", response_model=TestabilityAnalysis)
async def analyze_testability(params: TestGenerationParams) -> TestabilityAnalysis:
    """Analyze code testability and provide recommendations."""
    try:
        result = await test_generator.analyze_testability(params)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze testability: {str(e)}")


@router.post("/generate-tests", response_model=TestSuite)
async def generate_tests(params: TestGenerationParams) -> TestSuite:
    """Generate comprehensive test suite for a file."""
    try:
        result = await test_generator.generate_tests(params)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate tests: {str(e)}")


@router.post("/batch-generate-tests", response_model=List[TestSuite])
async def batch_generate_tests(params: BatchTestGenerationParams) -> List[TestSuite]:
    """Generate tests for multiple files."""
    try:
        results = []
        for file_path in params.file_paths:
            # Create individual params for each file
            file_params = TestGenerationParams(
                file_path=file_path,
                code_content=params.base_params.code_content,  # In real impl, would read from file
                test_types=params.base_params.test_types,
                framework=params.base_params.framework,
                coverage_target=params.base_params.coverage_target,
                mock_external=params.base_params.mock_external,
                include_edge_cases=params.base_params.include_edge_cases,
                max_tests_per_function=params.base_params.max_tests_per_function
            )
            
            test_suite = await test_generator.generate_tests(file_params)
            results.append(test_suite)
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to batch generate tests: {str(e)}")


@router.post("/generate-test-data-factory", response_model=Dict[str, str])
async def generate_test_data_factory(params: TestDataFactoryParams) -> Dict[str, str]:
    """Generate test data factory code."""
    try:
        factory_code = await test_generator.generate_test_data_factory(
            params.schema, 
            params.language
        )
        
        return {
            "factory_name": params.factory_name,
            "language": params.language,
            "code": factory_code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test data factory: {str(e)}")


@router.post("/analyze-coverage", response_model=CoverageAnalysisResult)
async def analyze_coverage(params: TestGenerationParams) -> CoverageAnalysisResult:
    """Analyze test coverage and identify gaps."""
    try:
        # Analyze testability first
        testability = await test_generator.analyze_testability(params)
        
        # Calculate coverage metrics
        total_functions = len(testability.testable_functions)
        covered_functions = len(testability.existing_tests)
        coverage_percentage = (covered_functions / total_functions * 100) if total_functions > 0 else 0
        
        # Identify uncovered functions
        uncovered_functions = [
            func for func in testability.testable_functions 
            if func not in testability.existing_tests
        ]
        
        # Generate suggestions
        suggested_tests = []
        for func in uncovered_functions[:5]:  # Limit to top 5 suggestions
            suggested_tests.append(f"Add unit tests for {func}() function")
        
        # Mock coverage report
        coverage_report = {
            "total_functions": total_functions,
            "covered_functions": covered_functions,
            "coverage_percentage": coverage_percentage,
            "complex_functions_uncovered": len([
                func for func in testability.complex_functions 
                if func not in testability.existing_tests
            ])
        }
        
        return CoverageAnalysisResult(
            file_path=params.file_path,
            current_coverage=coverage_percentage,
            uncovered_lines=[],  # Would need actual coverage tool integration
            uncovered_functions=uncovered_functions,
            suggested_tests=suggested_tests,
            coverage_report=coverage_report
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze coverage: {str(e)}")


@router.get("/supported-frameworks", response_model=Dict[str, List[str]])
async def get_supported_frameworks() -> Dict[str, List[str]]:
    """Get list of supported testing frameworks by language."""
    return {
        "python": ["pytest", "unittest", "nose2"],
        "javascript": ["jest", "mocha", "jasmine"],
        "typescript": ["jest", "vitest", "mocha"],
        "java": ["junit", "testng"],
        "csharp": ["nunit", "xunit", "mstest"],
        "go": ["testing", "testify"],
        "rust": ["cargo-test", "rstest"],
        "php": ["phpunit", "codeception"],
        "ruby": ["rspec", "minitest"]
    }


@router.get("/test-templates", response_model=Dict[str, Dict[str, str]])
async def get_test_templates() -> Dict[str, Dict[str, str]]:
    """Get test templates for different frameworks and scenarios."""
    return {
        "jest": {
            "unit_test": """
test('should {description}', async () => {
  // Arrange
  const input = {test_data};
  
  // Act
  const result = await {function_name}(input);
  
  // Assert
  expect(result).toBeDefined();
  expect(result).toEqual(expected);
});
            """,
            "mock_test": """
jest.mock('{module_path}');

test('should {description} with mocked dependencies', async () => {
  // Arrange
  const mockFn = jest.fn().mockResolvedValue(mockData);
  
  // Act & Assert
  const result = await {function_name}();
  expect(mockFn).toHaveBeenCalled();
});
            """
        },
        "pytest": {
            "unit_test": """
def test_{function_name}_{scenario}():
    '''Test {function_name} {description}.'''
    # Arrange
    input_data = {test_data}
    
    # Act
    result = {function_name}(input_data)
    
    # Assert
    assert result is not None
    assert isinstance(result, expected_type)
            """,
            "async_test": """
@pytest.mark.asyncio
async def test_{function_name}_{scenario}():
    '''Test {function_name} {description}.'''
    # Arrange
    input_data = {test_data}
    
    # Act
    result = await {function_name}(input_data)
    
    # Assert
    assert result is not None
            """
        }
    }


@router.post("/validate-test-code", response_model=Dict[str, Any])
async def validate_test_code(
    test_code: str,
    language: str,
    framework: str
) -> Dict[str, Any]:
    """Validate generated test code for syntax and best practices."""
    try:
        validation_result = {
            "is_valid": True,
            "syntax_errors": [],
            "warnings": [],
            "suggestions": [],
            "quality_score": 8.5
        }
        
        # Basic validation checks
        if not test_code.strip():
            validation_result["is_valid"] = False
            validation_result["syntax_errors"].append("Test code is empty")
            return validation_result
        
        # Framework-specific validation
        if framework == "jest" and "expect(" not in test_code:
            validation_result["warnings"].append("No assertions found - consider adding expect() statements")
        
        if framework == "pytest" and "assert " not in test_code:
            validation_result["warnings"].append("No assertions found - consider adding assert statements")
        
        # Best practice checks
        if "TODO" in test_code or "FIXME" in test_code:
            validation_result["warnings"].append("Test contains TODO/FIXME comments")
        
        if len(test_code.split('\n')) > 50:
            validation_result["suggestions"].append("Test is quite long - consider breaking into smaller tests")
        
        # Calculate quality score
        quality_factors = 0
        if any(assertion in test_code.lower() for assertion in ["expect", "assert", "should"]):
            quality_factors += 2
        if any(pattern in test_code.lower() for pattern in ["arrange", "act", "assert", "given", "when", "then"]):
            quality_factors += 2
        if "mock" in test_code.lower() or "stub" in test_code.lower():
            quality_factors += 1
        
        validation_result["quality_score"] = min(10.0, 5.0 + quality_factors)
        
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate test code: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint for test generation service."""
    return {
        "status": "healthy",
        "service": "test-generation",
        "version": "1.0.0"
    }