import { generateCodeDiff } from './ai/tools/codeDiff.js';
import { generateDocumentation } from './ai/tools/docGenerator.js';
import { analyzeCodeStructure } from './ai/tools/codeAnalyzer.js';
import { refactorCode } from './ai/tools/refactor.js';
import { 
  CodeDiffParams, 
  DocumentationParams, 
  CodeAnalysisParams, 
  RefactorParams,
  CodeDiffParamsSchema,
  DocumentationParamsSchema,
  CodeAnalysisParamsSchema,
  RefactorParamsSchema
} from '@/types/tools.js';

export type ToolFunction = 
  | 'generate_code_diff'
  | 'generate_documentation'
  | 'analyze_code_structure'
  | 'refactor_code';

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

export class ToolExecutor {
  async executeTool(toolName: ToolFunction, parameters: any): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        case 'generate_code_diff':
          return await this.executeCodeDiff(parameters);
        
        case 'generate_documentation':
          return await this.executeDocumentation(parameters);
        
        case 'analyze_code_structure':
          return await this.executeCodeAnalysis(parameters);
        
        case 'refactor_code':
          return await this.executeRefactor(parameters);
        
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async executeCodeDiff(parameters: any): Promise<ToolExecutionResult> {
    const validatedParams = CodeDiffParamsSchema.parse(parameters) as CodeDiffParams;
    const result = await generateCodeDiff(validatedParams);
    
    return {
      success: true,
      result
    };
  }

  private async executeDocumentation(parameters: any): Promise<ToolExecutionResult> {
    const validatedParams = DocumentationParamsSchema.parse(parameters) as DocumentationParams;
    const result = await generateDocumentation(validatedParams);
    
    return {
      success: true,
      result
    };
  }

  private async executeCodeAnalysis(parameters: any): Promise<ToolExecutionResult> {
    const validatedParams = CodeAnalysisParamsSchema.parse(parameters) as CodeAnalysisParams;
    const result = await analyzeCodeStructure(validatedParams);
    
    return {
      success: true,
      result
    };
  }

  private async executeRefactor(parameters: any): Promise<ToolExecutionResult> {
    const validatedParams = RefactorParamsSchema.parse(parameters) as RefactorParams;
    const result = await refactorCode(validatedParams);
    
    return {
      success: true,
      result
    };
  }
}

export const toolExecutor = new ToolExecutor();