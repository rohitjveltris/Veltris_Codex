import express from 'express';
import { aiProxyService } from '../services/aiProxy.js';
import { validateRequest } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const testGenerationSchema = z.object({
  file_path: z.string().min(1),
  code_content: z.string().min(1),
  test_types: z.array(z.string()).optional().default(['unit']),
  framework: z.string().optional().default('auto'),
  coverage_target: z.number().min(0).max(100).optional().default(85),
  mock_external: z.boolean().optional().default(true),
  include_edge_cases: z.boolean().optional().default(true),
  max_tests_per_function: z.number().min(1).max(20).optional().default(8)
});

const batchTestGenerationSchema = z.object({
  file_paths: z.array(z.string().min(1)).min(1),
  base_params: testGenerationSchema
});

const testDataFactorySchema = z.object({
  schema: z.record(z.any()),
  language: z.string().optional().default('typescript'),
  factory_name: z.string().optional().default('TestDataFactory')
});

const validateTestCodeSchema = z.object({
  test_code: z.string().min(1),
  language: z.string().min(1),
  framework: z.string().min(1)
});

// Routes

/**
 * Analyze code testability
 */
router.post('/analyze-testability', 
  validateRequest(testGenerationSchema),
  async (req, res) => {
    try {
      const response = await aiProxyService.post('/api/test-generation/analyze-testability', req.body);
      res.json(response);
    } catch (error) {
      console.error('Error analyzing testability:', error);
      res.status(500).json({ 
        error: 'Failed to analyze testability',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate comprehensive test suite
 */
router.post('/generate-tests',
  validateRequest(testGenerationSchema),
  async (req, res) => {
    try {
      const response = await aiProxyService.post('/api/test-generation/generate-tests', req.body);
      res.json(response);
    } catch (error) {
      console.error('Error generating tests:', error);
      res.status(500).json({ 
        error: 'Failed to generate tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate tests for multiple files
 */
router.post('/batch-generate-tests',
  validateRequest(batchTestGenerationSchema),
  async (req, res) => {
    try {
      const response = await aiProxyService.post('/api/test-generation/batch-generate-tests', req.body);
      res.json(response);
    } catch (error) {
      console.error('Error batch generating tests:', error);
      res.status(500).json({ 
        error: 'Failed to batch generate tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate test data factory
 */
router.post('/generate-test-data-factory',
  validateRequest(testDataFactorySchema),
  async (req, res) => {
    try {
      const response = await aiProxyService.post('/api/test-generation/generate-test-data-factory', req.body);
      res.json(response);
    } catch (error) {
      console.error('Error generating test data factory:', error);
      res.status(500).json({ 
        error: 'Failed to generate test data factory',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Analyze test coverage
 */
router.post('/analyze-coverage',
  validateRequest(testGenerationSchema),
  async (req, res) => {
    try {
      const response = await aiProxyService.post('/api/test-generation/analyze-coverage', req.body);
      res.json(response);
    } catch (error) {
      console.error('Error analyzing coverage:', error);
      res.status(500).json({ 
        error: 'Failed to analyze coverage',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get supported testing frameworks
 */
router.get('/supported-frameworks', async (req, res) => {
  try {
    const response = await aiProxyService.get('/api/test-generation/supported-frameworks');
    res.json(response);
  } catch (error) {
    console.error('Error getting supported frameworks:', error);
    res.status(500).json({ 
      error: 'Failed to get supported frameworks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get test templates
 */
router.get('/test-templates', async (req, res) => {
  try {
    const response = await aiProxyService.get('/api/test-generation/test-templates');
    res.json(response);
  } catch (error) {
    console.error('Error getting test templates:', error);
    res.status(500).json({ 
      error: 'Failed to get test templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate test code
 */
router.post('/validate-test-code',
  validateRequest(validateTestCodeSchema),
  async (req, res) => {
    try {
      const { test_code, language, framework } = req.body;
      const response = await aiProxyService.post('/api/test-generation/validate-test-code', {
        test_code,
        language,
        framework
      });
      res.json(response);
    } catch (error) {
      console.error('Error validating test code:', error);
      res.status(500).json({ 
        error: 'Failed to validate test code',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate and save test files to filesystem
 */
router.post('/generate-and-save-tests',
  validateRequest(testGenerationSchema.extend({
    save_directory: z.string().optional().default('./tests'),
    create_directory: z.boolean().optional().default(true)
  })),
  async (req, res) => {
    try {
      // Generate the test suite first
      const response = await aiProxyService.post('/api/test-generation/generate-tests', req.body);
      const testSuite = response;
      
      if (!testSuite || !testSuite.test_cases || testSuite.test_cases.length === 0) {
        return res.status(400).json({
          error: 'No test cases generated',
          details: 'The test generation did not produce any test cases'
        });
      }

      // Import filesystem modules
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const { save_directory = './tests', create_directory = true } = req.body;
      const testFilePath = path.join(save_directory, testSuite.test_file_path);
      
      // Create directory if it doesn't exist
      if (create_directory) {
        await fs.mkdir(path.dirname(testFilePath), { recursive: true });
      }
      
      // Build complete test file content
      let fileContent = '';
      
      // Add imports
      if (testSuite.imports && testSuite.imports.length > 0) {
        fileContent += testSuite.imports.join('\n') + '\n\n';
      }
      
      // Add setup code
      if (testSuite.setup_code) {
        fileContent += testSuite.setup_code + '\n\n';
      }
      
      // Add all test cases
      for (const testCase of testSuite.test_cases) {
        fileContent += testCase.test_code + '\n\n';
      }
      
      // Add teardown code if present
      if (testSuite.teardown_code) {
        fileContent += testSuite.teardown_code + '\n';
      }
      
      // Save the file
      await fs.writeFile(testFilePath, fileContent, 'utf-8');
      
      res.json({
        success: true,
        message: 'Test file created successfully',
        file_path: testFilePath,
        test_suite: testSuite,
        file_size: Buffer.byteLength(fileContent, 'utf-8')
      });
      
    } catch (error) {
      console.error('Error generating and saving test file:', error);
      res.status(500).json({ 
        error: 'Failed to generate and save test file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Health check for test generation service
 */
router.get('/health', async (req, res) => {
  try {
    const response = await aiProxyService.get('/api/test-generation/health');
    res.json(response);
  } catch (error) {
    console.error('Error checking test generation health:', error);
    res.status(500).json({ 
      error: 'Test generation service unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;