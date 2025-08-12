import { z } from 'zod';

// Tool parameter schemas
export const CodeDiffParamsSchema = z.object({
  oldCode: z.string().describe('Original version of the code'),
  newCode: z.string().describe('Updated version of the code'),
  language: z.string().optional().describe('Programming language (e.g., tsx, js, py)')
});

export const DocumentationParamsSchema = z.object({
  docType: z.enum(['BRD', 'SRD', 'README', 'API_DOCS']).describe('Type of documentation to generate'),
  projectContext: z.string().describe('Project-level description, user goal, or business purpose'),
  codeStructure: z.string().optional().describe('Description of file structure or key components')
});

export const CodeAnalysisParamsSchema = z.object({
  filePath: z.string().describe('Relative file path'),
  codeContent: z.string().describe('Source code to analyze')
});

export const RefactorParamsSchema = z.object({
  originalCode: z.string().describe('The source code to be refactored'),
  refactorType: z.enum(['optimize', 'modernize', 'add_types', 'extract_components'])
    .describe('The type of refactoring to apply')
});

// Tool result types
export interface CodeDiffResult {
  diffs: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: number;
  }>;
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesChanged: number;
  };
}

export interface DocumentationResult {
  content: string;
  docType: string;
  sections: string[];
  wordCount: number;
}

export interface CodeAnalysisResult {
  structure: {
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
  };
  metrics: {
    linesOfCode: number;
    complexity: number;
    maintainabilityScore: number;
  };
  suggestions: string[];
  patterns: string[];
}

export interface RefactorResult {
  refactoredCode: string;
  changes: Array<{
    type: string;
    description: string;
    lineNumber: number;
  }>;
  improvements: string[];
  refactorType: string;
}

// Tool function types
export type CodeDiffParams = z.infer<typeof CodeDiffParamsSchema>;
export type DocumentationParams = z.infer<typeof DocumentationParamsSchema>;
export type CodeAnalysisParams = z.infer<typeof CodeAnalysisParamsSchema>;
export type RefactorParams = z.infer<typeof RefactorParamsSchema>;

// Tool definitions for AI providers
export const AI_TOOLS = [
  {
    name: 'generate_code_diff',
    description: 'Generate and display code differences',
    parameters: {
      type: 'object',
      properties: {
        oldCode: { type: 'string', description: 'Original version of the code' },
        newCode: { type: 'string', description: 'Updated version of the code' },
        language: { type: 'string', description: 'Programming language (e.g., tsx, js, py)' }
      },
      required: ['oldCode', 'newCode']
    }
  },
  {
    name: 'generate_documentation',
    description: 'Generate technical documentation like BRD, SRD, or README',
    parameters: {
      type: 'object',
      properties: {
        docType: {
          type: 'string',
          enum: ['BRD', 'SRD', 'README', 'API_DOCS'],
          description: 'Type of documentation to generate'
        },
        projectContext: {
          type: 'string',
          description: 'Project-level description, user goal, or business purpose'
        },
        codeStructure: {
          type: 'string',
          description: 'Description of file structure or key components'
        }
      },
      required: ['docType', 'projectContext']
    }
  },
  {
    name: 'analyze_code_structure',
    description: 'Analyze a file or project to detect patterns and structure',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative file path' },
        codeContent: { type: 'string', description: 'Source code to analyze' }
      },
      required: ['filePath', 'codeContent']
    }
  },
  {
    name: 'refactor_code',
    description: 'Refactor code with a specific strategy',
    parameters: {
      type: 'object',
      properties: {
        originalCode: {
          type: 'string',
          description: 'The source code to be refactored'
        },
        refactorType: {
          type: 'string',
          enum: ['optimize', 'modernize', 'add_types', 'extract_components'],
          description: 'The type of refactoring to apply'
        }
      },
      required: ['originalCode', 'refactorType']
    }
  }
] as const;