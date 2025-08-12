import { CodeAnalysisParams, CodeAnalysisResult } from '@/types/tools.js';

export const analyzeCodeStructure = async (params: CodeAnalysisParams): Promise<CodeAnalysisResult> => {
  const { filePath, codeContent } = params;
  
  // Basic code analysis - in a real implementation, you might use AST parsing
  const analysis = performBasicAnalysis(codeContent, filePath);
  
  return {
    structure: analysis.structure,
    metrics: analysis.metrics,
    suggestions: analysis.suggestions,
    patterns: analysis.patterns
  };
};

const performBasicAnalysis = (code: string, filePath: string) => {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  // Extract functions
  const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/g;
  const functions: string[] = [];
  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const functionName = match[1] || match[2] || match[3];
    if (functionName) {
      functions.push(functionName);
    }
  }
  
  // Extract classes
  const classRegex = /class\s+(\w+)/g;
  const classes: string[] = [];
  while ((match = classRegex.exec(code)) !== null) {
    classes.push(match[1]);
  }
  
  // Extract imports
  const importRegex = /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
  const imports: string[] = [];
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  // Extract exports
  const exportRegex = /export\s+(?:default\s+)?(?:class\s+(\w+)|function\s+(\w+)|const\s+(\w+))/g;
  const exports: string[] = [];
  while ((match = exportRegex.exec(code)) !== null) {
    const exportName = match[1] || match[2] || match[3];
    if (exportName) {
      exports.push(exportName);
    }
  }
  
  // Calculate complexity (simplified)
  const complexity = calculateComplexity(code);
  
  // Generate suggestions
  const suggestions = generateSuggestions(code, {
    functions: functions.length,
    classes: classes.length,
    linesOfCode: nonEmptyLines.length,
    complexity
  });
  
  // Detect patterns
  const patterns = detectPatterns(code, filePath);
  
  return {
    structure: {
      functions,
      classes,
      imports,
      exports
    },
    metrics: {
      linesOfCode: nonEmptyLines.length,
      complexity,
      maintainabilityScore: calculateMaintainabilityScore(nonEmptyLines.length, complexity, functions.length)
    },
    suggestions,
    patterns
  };
};

const calculateComplexity = (code: string): number => {
  // Simplified cyclomatic complexity calculation
  const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
  let complexity = 1; // Base complexity
  
  for (const keyword of complexityKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = code.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
};

const calculateMaintainabilityScore = (loc: number, complexity: number, functionCount: number): number => {
  // Simplified maintainability index calculation (0-100 scale)
  const baseScore = 100;
  const locPenalty = Math.min(loc / 10, 30); // Penalty for lines of code
  const complexityPenalty = Math.min(complexity * 2, 40); // Penalty for complexity
  const functionBonus = Math.min(functionCount * 2, 20); // Bonus for modular functions
  
  return Math.max(0, Math.min(100, baseScore - locPenalty - complexityPenalty + functionBonus));
};

const generateSuggestions = (code: string, metrics: any): string[] => {
  const suggestions: string[] = [];
  
  if (metrics.linesOfCode > 200) {
    suggestions.push('Consider breaking this file into smaller modules');
  }
  
  if (metrics.complexity > 20) {
    suggestions.push('High complexity detected - consider refactoring complex functions');
  }
  
  if (metrics.functions === 0 && metrics.classes === 0) {
    suggestions.push('Consider organizing code into functions or classes');
  }
  
  if (code.includes('// TODO') || code.includes('// FIXME')) {
    suggestions.push('Address TODO and FIXME comments');
  }
  
  if (!code.includes('try') && code.includes('await')) {
    suggestions.push('Consider adding error handling for async operations');
  }
  
  if (!/\/\*\*|\*\/|\/\//.test(code)) {
    suggestions.push('Add documentation comments to improve code readability');
  }
  
  return suggestions;
};

const detectPatterns = (code: string, filePath: string): string[] => {
  const patterns: string[] = [];
  
  // Detect React patterns
  if (code.includes('import React') || code.includes('from \'react\'')) {
    patterns.push('React Component');
    
    if (code.includes('useState') || code.includes('useEffect')) {
      patterns.push('React Hooks');
    }
    
    if (code.includes('interface') && code.includes('Props')) {
      patterns.push('TypeScript Props Interface');
    }
  }
  
  // Detect Node.js patterns
  if (code.includes('require(') || code.includes('module.exports')) {
    patterns.push('Node.js Module');
  }
  
  // Detect Express patterns
  if (code.includes('express') || code.includes('app.get') || code.includes('app.post')) {
    patterns.push('Express.js Route Handler');
  }
  
  // Detect async patterns
  if (code.includes('async') && code.includes('await')) {
    patterns.push('Async/Await Pattern');
  }
  
  // Detect design patterns
  if (code.includes('class') && code.includes('constructor')) {
    patterns.push('Class-based Architecture');
  }
  
  if (code.includes('export default') && filePath.includes('index')) {
    patterns.push('Barrel Export Pattern');
  }
  
  return patterns;
};