// Test Generation Types

export interface TestGenerationParams {
  file_path: string;
  code_content: string;
  test_types?: string[];
  framework?: string;
  coverage_target?: number;
  mock_external?: boolean;
  include_edge_cases?: boolean;
  max_tests_per_function?: number;
}

export interface TestCase {
  name: string;
  description: string;
  test_code: string;
  test_type: string;
  complexity_score: number;
}

export interface MockData {
  name: string;
  type: string;
  sample_data: Record<string, any>;
  schema?: Record<string, any>;
}

export interface TestSuite {
  file_path: string;
  test_file_path: string;
  framework: string;
  language: string;
  test_cases: TestCase[];
  mock_data: MockData[];
  setup_code: string;
  teardown_code: string;
  imports: string[];
  coverage_estimate: number;
  quality_score: number;
}

export interface TestabilityAnalysis {
  file_path: string;
  testability_score: number;
  testable_functions: string[];
  complex_functions: string[];
  dependencies: string[];
  existing_tests: string[];
  coverage_gaps: string[];
  recommendations: string[];
}

export interface BatchTestGenerationParams {
  file_paths: string[];
  base_params: TestGenerationParams;
}

export interface TestDataFactoryParams {
  schema: Record<string, any>;
  language?: string;
  factory_name?: string;
}

export interface CoverageAnalysisResult {
  file_path: string;
  current_coverage: number;
  uncovered_lines: number[];
  uncovered_functions: string[];
  suggested_tests: string[];
  coverage_report: Record<string, any>;
}

export interface TestValidationResult {
  is_valid: boolean;
  syntax_errors: string[];
  warnings: string[];
  suggestions: string[];
  quality_score: number;
}

export interface SupportedFrameworks {
  [language: string]: string[];
}

export interface TestTemplates {
  [framework: string]: {
    [template_type: string]: string;
  };
}

// Test Generation Context Types
export interface TestGenerationState {
  currentFile: string | null;
  selectedFiles: string[];
  testSuites: TestSuite[];
  testabilityAnalysis: TestabilityAnalysis | null;
  coverageAnalysis: CoverageAnalysisResult | null;
  isGenerating: boolean;
  generationProgress: GenerationProgress;
  settings: TestGenerationSettings;
  supportedFrameworks: SupportedFrameworks;
  templates: TestTemplates;
}

export interface GenerationProgress {
  current: number;
  total: number;
  currentFile: string;
  stage: 'analyzing' | 'generating' | 'validating' | 'completed';
}

export interface TestGenerationSettings {
  framework: string;
  testTypes: string[];
  coverageTarget: number;
  mockExternal: boolean;
  includeEdgeCases: boolean;
  maxTestsPerFunction: number;
  autoRun: boolean;
  generateMocks: boolean;
  includePerformanceTests: boolean;
}

export interface TestGenerationActions {
  setCurrentFile: (filePath: string | null) => void;
  setSelectedFiles: (filePaths: string[]) => void;
  analyzeTestability: (params: TestGenerationParams) => Promise<TestabilityAnalysis>;
  generateTests: (params: TestGenerationParams) => Promise<TestSuite>;
  batchGenerateTests: (params: BatchTestGenerationParams) => Promise<TestSuite[]>;
  generateTestDataFactory: (params: TestDataFactoryParams) => Promise<{code: string}>;
  analyzeCoverage: (params: TestGenerationParams) => Promise<CoverageAnalysisResult>;
  validateTestCode: (code: string, language: string, framework: string) => Promise<TestValidationResult>;
  updateSettings: (settings: Partial<TestGenerationSettings>) => void;
  clearResults: () => void;
}

// UI Component Props
export interface TestGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TestCaseCardProps {
  testCase: TestCase;
  onEdit: (testCase: TestCase) => void;
  onDelete: (testCase: TestCase) => void;
  onPreview: (testCase: TestCase) => void;
}

export interface TestSuiteViewerProps {
  testSuite: TestSuite;
  onApprove: () => void;
  onReject: () => void;
  onModify: (modifiedSuite: TestSuite) => void;
}

export interface BatchGenerationProgressProps {
  progress: GenerationProgress;
  onCancel: () => void;
  onPause: () => void;
}

export interface TestabilityScoreProps {
  score: number;
  analysis: TestabilityAnalysis;
  showDetails?: boolean;
}

export interface CoverageVisualizationProps {
  coverage: CoverageAnalysisResult;
  onGenerateTests: (functions: string[]) => void;
}

export interface TestFrameworkSelectorProps {
  language: string;
  selectedFramework: string;
  supportedFrameworks: SupportedFrameworks;
  onFrameworkChange: (framework: string) => void;
}

export interface TestConfigurationProps {
  settings: TestGenerationSettings;
  onChange: (settings: Partial<TestGenerationSettings>) => void;
}

export interface MockDataPreviewProps {
  mockData: MockData[];
  onEdit: (mockData: MockData) => void;
  onGenerate: (schema: Record<string, any>) => void;
}

// API Response Types
export interface TestGenerationResponse {
  success: boolean;
  data?: TestSuite;
  error?: string;
  details?: string;
}

export interface BatchTestGenerationResponse {
  success: boolean;
  data?: TestSuite[];
  error?: string;
  details?: string;
}

export interface TestabilityAnalysisResponse {
  success: boolean;
  data?: TestabilityAnalysis;
  error?: string;
  details?: string;
}

export interface CoverageAnalysisResponse {
  success: boolean;
  data?: CoverageAnalysisResult;
  error?: string;
  details?: string;
}

// Context Menu Types
export interface FileContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
}

// Chat Integration Types
export interface TestGenerationChatCommand {
  command: string;
  description: string;
  examples: string[];
  handler: (message: string, params?: any) => Promise<void>;
}

export interface TestGenerationSuggestion {
  type: 'generate_tests' | 'analyze_testability' | 'create_test_data' | 'improve_coverage';
  title: string;
  description: string;
  action: () => void;
  priority: 'high' | 'medium' | 'low';
}

export interface TestGenerationNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  timestamp: Date;
  autoClose?: boolean;
}