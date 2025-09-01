import { 
  TestGenerationParams, 
  TestSuite, 
  TestabilityAnalysis,
  BatchTestGenerationParams,
  TestDataFactoryParams,
  CoverageAnalysisResult,
  TestValidationResult,
  SupportedFrameworks,
  TestTemplates
} from '@/types/testGeneration';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class TestGenerationApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/test-generation`;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Unknown error', 
          details: response.statusText 
        }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Core test generation methods
  async analyzeTestability(params: TestGenerationParams): Promise<TestabilityAnalysis> {
    return this.makeRequest<TestabilityAnalysis>('/analyze-testability', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async generateTests(params: TestGenerationParams): Promise<TestSuite> {
    return this.makeRequest<TestSuite>('/generate-tests', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async batchGenerateTests(params: BatchTestGenerationParams): Promise<TestSuite[]> {
    return this.makeRequest<TestSuite[]>('/batch-generate-tests', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async generateTestDataFactory(params: TestDataFactoryParams): Promise<{ code: string; factory_name: string; language: string }> {
    return this.makeRequest<{ code: string; factory_name: string; language: string }>('/generate-test-data-factory', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async analyzeCoverage(params: TestGenerationParams): Promise<CoverageAnalysisResult> {
    return this.makeRequest<CoverageAnalysisResult>('/analyze-coverage', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async validateTestCode(testCode: string, language: string, framework: string): Promise<TestValidationResult> {
    return this.makeRequest<TestValidationResult>('/validate-test-code', {
      method: 'POST',
      body: JSON.stringify({
        test_code: testCode,
        language,
        framework,
      }),
    });
  }

  // Metadata and configuration methods
  async getSupportedFrameworks(): Promise<SupportedFrameworks> {
    return this.makeRequest<SupportedFrameworks>('/supported-frameworks', {
      method: 'GET',
    });
  }

  async getTestTemplates(): Promise<TestTemplates> {
    return this.makeRequest<TestTemplates>('/test-templates', {
      method: 'GET',
    });
  }

  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    return this.makeRequest<{ status: string; service: string; version: string }>('/health', {
      method: 'GET',
    });
  }

  // Utility methods
  async detectFramework(filePath: string, codeContent: string): Promise<string> {
    // Simple client-side framework detection based on file content
    if (filePath.endsWith('.py')) {
      if (codeContent.includes('import pytest') || codeContent.includes('def test_')) {
        return 'pytest';
      }
      return 'pytest'; // Default for Python
    }
    
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      if (codeContent.includes('vitest') || codeContent.includes('vi.')) {
        return 'vitest';
      }
      if (codeContent.includes('jest')) {
        return 'jest';
      }
      return 'vitest'; // Default for TypeScript
    }
    
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      if (codeContent.includes('jest')) {
        return 'jest';
      }
      return 'jest'; // Default for JavaScript
    }
    
    return 'auto';
  }

  generateTestFilePath(sourceFilePath: string, framework: string): string {
    const parts = sourceFilePath.split('.');
    const extension = parts.pop();
    const baseName = parts.join('.');
    
    switch (framework) {
      case 'pytest':
        return `test_${baseName.split('/').pop()}.py`;
      case 'jest':
      case 'vitest':
        return `${baseName}.test.${extension}`;
      default:
        return `${baseName}_test.${extension}`;
    }
  }

  estimateGenerationTime(codeLines: number, testTypes: string[]): number {
    // Estimate generation time in seconds
    const baseTime = Math.max(5, Math.ceil(codeLines / 50)); // 1 second per 50 lines, min 5 seconds
    const typeMultiplier = testTypes.length; // More test types = more time
    return baseTime * typeMultiplier;
  }

  parseTestSuiteForPreview(testSuite: TestSuite): {
    summary: string;
    highlights: string[];
    concerns: string[];
  } {
    const summary = `Generated ${testSuite.test_cases.length} test cases with ${testSuite.coverage_estimate.toFixed(1)}% estimated coverage`;
    
    const highlights = [
      `Framework: ${testSuite.framework}`,
      `Language: ${testSuite.language}`,
      `Quality Score: ${testSuite.quality_score.toFixed(1)}/10`,
      `Mock Data: ${testSuite.mock_data.length} items`
    ];

    const concerns = [];
    if (testSuite.coverage_estimate < 70) {
      concerns.push('Low coverage estimate - consider adding more test cases');
    }
    if (testSuite.quality_score < 7) {
      concerns.push('Test quality could be improved - review generated tests');
    }
    if (testSuite.test_cases.length === 0) {
      concerns.push('No test cases generated - check code structure');
    }

    return { summary, highlights, concerns };
  }
}

export const testGenerationApi = new TestGenerationApi();

// Export additional utility functions
export const TestGenerationUtils = {
  /**
   * Extract function names from code for quick analysis
   */
  extractFunctionNames: (code: string, language: string): string[] => {
    const patterns: { [key: string]: RegExp } = {
      javascript: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/g,
      typescript: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/g,
      python: /def\s+(\w+)\s*\(|async\s+def\s+(\w+)\s*\(/g,
    };

    const pattern = patterns[language];
    if (!pattern) return [];

    const matches = [];
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      if (functionName && !functionName.startsWith('_')) {
        matches.push(functionName);
      }
    }

    return Array.from(new Set(matches)); // Remove duplicates
  },

  /**
   * Calculate complexity score for code
   */
  calculateComplexityScore: (code: string): number => {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
    let complexity = 1;
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = code.match(regex) || [];
      complexity += matches.length;
    }
    
    return Math.min(complexity, 20); // Cap at 20
  },

  /**
   * Format test generation error for user display
   */
  formatError: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred during test generation';
  },

  /**
   * Validate test generation parameters
   */
  validateParams: (params: TestGenerationParams): string[] => {
    const errors: string[] = [];

    if (!params.file_path?.trim()) {
      errors.push('File path is required');
    }

    if (!params.code_content?.trim()) {
      errors.push('Code content is required');
    }

    if (params.coverage_target && (params.coverage_target < 0 || params.coverage_target > 100)) {
      errors.push('Coverage target must be between 0 and 100');
    }

    if (params.max_tests_per_function && params.max_tests_per_function < 1) {
      errors.push('Max tests per function must be at least 1');
    }

    return errors;
  },

  /**
   * Generate default test generation params
   */
  getDefaultParams: (filePath: string, codeContent: string): TestGenerationParams => {
    return {
      file_path: filePath,
      code_content: codeContent,
      test_types: ['unit'],
      framework: 'auto',
      coverage_target: 85,
      mock_external: true,
      include_edge_cases: true,
      max_tests_per_function: 8,
    };
  },
};