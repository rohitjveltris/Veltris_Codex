import React, { createContext, useContext, useState, useCallback } from 'react';
import { testGenerationApi } from '@/lib/testGenerationApi';
import {
  TestGenerationState,
  TestGenerationActions,
  TestGenerationParams,
  TestSuite,
  TestabilityAnalysis,
  BatchTestGenerationParams,
  TestDataFactoryParams,
  CoverageAnalysisResult,
  TestValidationResult,
  TestGenerationSettings,
  GenerationProgress
} from '@/types/testGeneration';

const initialSettings: TestGenerationSettings = {
  framework: 'auto',
  testTypes: ['unit'],
  coverageTarget: 85,
  mockExternal: true,
  includeEdgeCases: true,
  maxTestsPerFunction: 8,
  autoRun: false,
  generateMocks: true,
  includePerformanceTests: false,
};

const initialState: TestGenerationState = {
  currentFile: null,
  selectedFiles: [],
  testSuites: [],
  testabilityAnalysis: null,
  coverageAnalysis: null,
  isGenerating: false,
  generationProgress: {
    current: 0,
    total: 0,
    currentFile: '',
    stage: 'analyzing',
  },
  settings: initialSettings,
  supportedFrameworks: {},
  templates: {},
};

const TestGenerationContext = createContext<
  (TestGenerationState & TestGenerationActions) | null
>(null);

interface TestGenerationProviderProps {
  children: React.ReactNode;
}

export const TestGenerationProvider: React.FC<TestGenerationProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<TestGenerationState>(initialState);

  // Actions
  const setCurrentFile = useCallback((filePath: string | null) => {
    setState(prev => ({ ...prev, currentFile: filePath }));
  }, []);

  const setSelectedFiles = useCallback((filePaths: string[]) => {
    setState(prev => ({ ...prev, selectedFiles: filePaths }));
  }, []);

  const updateProgress = useCallback((progress: Partial<GenerationProgress>) => {
    setState(prev => ({
      ...prev,
      generationProgress: { ...prev.generationProgress, ...progress }
    }));
  }, []);

  const analyzeTestability = useCallback(async (params: TestGenerationParams): Promise<TestabilityAnalysis> => {
    try {
      updateProgress({ stage: 'analyzing' });
      const analysis = await testGenerationApi.analyzeTestability(params);
      setState(prev => ({ ...prev, testabilityAnalysis: analysis }));
      return analysis;
    } catch (error) {
      console.error('Failed to analyze testability:', error);
      throw error;
    }
  }, [updateProgress]);

  const generateTests = useCallback(async (params: TestGenerationParams): Promise<TestSuite> => {
    try {
      setState(prev => ({ ...prev, isGenerating: true }));
      updateProgress({ 
        stage: 'generating',
        current: 1,
        total: 1,
        currentFile: params.file_path
      });

      const testSuite = await testGenerationApi.generateTests(params);
      
      setState(prev => ({
        ...prev,
        testSuites: [...prev.testSuites.filter(ts => ts.file_path !== testSuite.file_path), testSuite],
        isGenerating: false,
      }));

      updateProgress({ stage: 'completed', current: 1, total: 1 });
      
      return testSuite;
    } catch (error) {
      setState(prev => ({ ...prev, isGenerating: false }));
      console.error('Failed to generate tests:', error);
      throw error;
    }
  }, [updateProgress]);

  const batchGenerateTests = useCallback(async (params: BatchTestGenerationParams): Promise<TestSuite[]> => {
    try {
      setState(prev => ({ ...prev, isGenerating: true }));
      const totalFiles = params.file_paths.length;
      
      updateProgress({
        stage: 'generating',
        current: 0,
        total: totalFiles
      });

      const results: TestSuite[] = [];
      
      for (let i = 0; i < params.file_paths.length; i++) {
        const filePath = params.file_paths[i];
        
        updateProgress({
          current: i + 1,
          currentFile: filePath
        });

        try {
          const fileParams: TestGenerationParams = {
            ...params.base_params,
            file_path: filePath
          };
          
          const testSuite = await testGenerationApi.generateTests(fileParams);
          results.push(testSuite);
          
          // Update state with individual results
          setState(prev => ({
            ...prev,
            testSuites: [...prev.testSuites.filter(ts => ts.file_path !== testSuite.file_path), testSuite]
          }));
        } catch (error) {
          console.error(`Failed to generate tests for ${filePath}:`, error);
          // Continue with other files
        }
      }

      setState(prev => ({ ...prev, isGenerating: false }));
      updateProgress({ stage: 'completed', current: totalFiles, total: totalFiles });
      
      return results;
    } catch (error) {
      setState(prev => ({ ...prev, isGenerating: false }));
      console.error('Failed to batch generate tests:', error);
      throw error;
    }
  }, [updateProgress]);

  const generateTestDataFactory = useCallback(async (params: TestDataFactoryParams): Promise<{code: string}> => {
    try {
      updateProgress({ stage: 'generating' });
      const result = await testGenerationApi.generateTestDataFactory(params);
      updateProgress({ stage: 'completed' });
      return { code: result.code };
    } catch (error) {
      console.error('Failed to generate test data factory:', error);
      throw error;
    }
  }, [updateProgress]);

  const analyzeCoverage = useCallback(async (params: TestGenerationParams): Promise<CoverageAnalysisResult> => {
    try {
      updateProgress({ stage: 'analyzing' });
      const analysis = await testGenerationApi.analyzeCoverage(params);
      setState(prev => ({ ...prev, coverageAnalysis: analysis }));
      updateProgress({ stage: 'completed' });
      return analysis;
    } catch (error) {
      console.error('Failed to analyze coverage:', error);
      throw error;
    }
  }, [updateProgress]);

  const validateTestCode = useCallback(async (
    code: string, 
    language: string, 
    framework: string
  ): Promise<TestValidationResult> => {
    try {
      return await testGenerationApi.validateTestCode(code, language, framework);
    } catch (error) {
      console.error('Failed to validate test code:', error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TestGenerationSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      testSuites: [],
      testabilityAnalysis: null,
      coverageAnalysis: null,
      generationProgress: {
        current: 0,
        total: 0,
        currentFile: '',
        stage: 'analyzing'
      }
    }));
  }, []);

  // Load initial data
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [frameworks, templates] = await Promise.all([
          testGenerationApi.getSupportedFrameworks(),
          testGenerationApi.getTestTemplates(),
        ]);

        setState(prev => ({
          ...prev,
          supportedFrameworks: frameworks,
          templates: templates,
        }));
      } catch (error) {
        console.error('Failed to load initial test generation data:', error);
      }
    };

    loadInitialData();
  }, []);

  const contextValue = {
    ...state,
    setCurrentFile,
    setSelectedFiles,
    analyzeTestability,
    generateTests,
    batchGenerateTests,
    generateTestDataFactory,
    analyzeCoverage,
    validateTestCode,
    updateSettings,
    clearResults,
  };

  return (
    <TestGenerationContext.Provider value={contextValue}>
      {children}
    </TestGenerationContext.Provider>
  );
};

export const useTestGeneration = (): TestGenerationState & TestGenerationActions => {
  const context = useContext(TestGenerationContext);
  if (!context) {
    throw new Error('useTestGeneration must be used within a TestGenerationProvider');
  }
  return context;
};

// Additional hooks for specific functionality
export const useTestGenerationSettings = () => {
  const { settings, updateSettings } = useTestGeneration();
  return { settings, updateSettings };
};

export const useTestAnalysis = () => {
  const { 
    testabilityAnalysis, 
    coverageAnalysis, 
    analyzeTestability, 
    analyzeCoverage 
  } = useTestGeneration();
  
  return { 
    testabilityAnalysis, 
    coverageAnalysis, 
    analyzeTestability, 
    analyzeCoverage 
  };
};

export const useTestSuiteManager = () => {
  const { 
    testSuites, 
    generateTests, 
    batchGenerateTests,
    validateTestCode,
    isGenerating,
    generationProgress 
  } = useTestGeneration();
  
  return { 
    testSuites, 
    generateTests, 
    batchGenerateTests,
    validateTestCode,
    isGenerating,
    generationProgress 
  };
};

export const useTestDataFactory = () => {
  const { generateTestDataFactory } = useTestGeneration();
  
  const generateFactory = useCallback(async (
    schema: Record<string, any>,
    language: string = 'typescript',
    factoryName: string = 'TestDataFactory'
  ) => {
    return generateTestDataFactory({ schema, language, factory_name: factoryName });
  }, [generateTestDataFactory]);
  
  return { generateFactory };
};