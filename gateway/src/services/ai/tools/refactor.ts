import { RefactorParams, RefactorResult } from '@/types/tools.js';

export const refactorCode = async (params: RefactorParams): Promise<RefactorResult> => {
  const { originalCode, refactorType } = params;
  
  let refactoredCode: string;
  let changes: RefactorResult['changes'] = [];
  let improvements: string[] = [];
  
  switch (refactorType) {
    case 'optimize':
      ({ code: refactoredCode, changes, improvements } = optimizeCode(originalCode));
      break;
    case 'modernize':
      ({ code: refactoredCode, changes, improvements } = modernizeCode(originalCode));
      break;
    case 'add_types':
      ({ code: refactoredCode, changes, improvements } = addTypes(originalCode));
      break;
    case 'extract_components':
      ({ code: refactoredCode, changes, improvements } = extractComponents(originalCode));
      break;
    default:
      throw new Error(`Unsupported refactor type: ${refactorType}`);
  }
  
  return {
    refactoredCode,
    changes,
    improvements,
    refactorType
  };
};

const optimizeCode = (code: string) => {
  let refactoredCode = code;
  const changes: RefactorResult['changes'] = [];
  const improvements: string[] = [];
  
  // Remove console.log statements
  const consoleLogRegex = /console\.log\([^)]*\);\s*/g;
  if (consoleLogRegex.test(refactoredCode)) {
    refactoredCode = refactoredCode.replace(consoleLogRegex, '');
    changes.push({
      type: 'optimization',
      description: 'Removed console.log statements',
      lineNumber: 0
    });
    improvements.push('Removed debugging console.log statements');
  }
  
  // Optimize string concatenation to template literals
  const stringConcatRegex = /(\w+)\s*\+\s*['"`]([^'"`]*)['"`]\s*\+\s*(\w+)/g;
  if (stringConcatRegex.test(refactoredCode)) {
    refactoredCode = refactoredCode.replace(stringConcatRegex, '`${$1}$2${$3}`');
    changes.push({
      type: 'optimization',
      description: 'Converted string concatenation to template literals',
      lineNumber: 0
    });
    improvements.push('Used template literals for better string interpolation');
  }
  
  // Convert var to const/let
  const varRegex = /\bvar\s+(\w+)/g;
  if (varRegex.test(refactoredCode)) {
    refactoredCode = refactoredCode.replace(varRegex, 'const $1');
    changes.push({
      type: 'optimization',
      description: 'Replaced var declarations with const',
      lineNumber: 0
    });
    improvements.push('Used const/let instead of var for better scoping');
  }
  
  return { code: refactoredCode, changes, improvements };
};

const modernizeCode = (code: string) => {
  let refactoredCode = code;
  const changes: RefactorResult['changes'] = [];
  const improvements: string[] = [];
  
  // Convert function declarations to arrow functions where appropriate
  const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*{/g;
  if (functionRegex.test(refactoredCode)) {
    refactoredCode = refactoredCode.replace(functionRegex, 'const $1 = ($2) => {');
    changes.push({
      type: 'modernization',
      description: 'Converted function declarations to arrow functions',
      lineNumber: 0
    });
    improvements.push('Modernized to arrow function syntax');
  }
  
  // Add destructuring where possible
  const objectAccessRegex = /const\s+(\w+)\s*=\s*(\w+)\.(\w+);/g;
  if (objectAccessRegex.test(refactoredCode)) {
    refactoredCode = refactoredCode.replace(objectAccessRegex, 'const { $3: $1 } = $2;');
    changes.push({
      type: 'modernization',
      description: 'Added object destructuring',
      lineNumber: 0
    });
    improvements.push('Used destructuring assignment for cleaner code');
  }
  
  // Convert to async/await if promises are detected
  if (refactoredCode.includes('.then(') && !refactoredCode.includes('async')) {
    changes.push({
      type: 'modernization',
      description: 'Consider converting to async/await pattern',
      lineNumber: 0
    });
    improvements.push('Consider using async/await instead of .then() chains');
  }
  
  return { code: refactoredCode, changes, improvements };
};

const addTypes = (code: string) => {
  let refactoredCode = code;
  const changes: RefactorResult['changes'] = [];
  const improvements: string[] = [];
  
  // Add basic parameter types
  const functionParamRegex = /\(([^)]+)\)\s*=>\s*{/g;
  const matches = [...refactoredCode.matchAll(functionParamRegex)];
  
  for (const match of matches) {
    const params = match[1];
    if (!params.includes(':')) {
      // Simple heuristic: if parameter is used with .length, assume string/array
      if (refactoredCode.includes(`${params.trim()}.length`)) {
        const typedParams = `${params.trim()}: string | any[]`;
        refactoredCode = refactoredCode.replace(match[0], `(${typedParams}) => {`);
        changes.push({
          type: 'typing',
          description: `Added type annotation for parameter ${params.trim()}`,
          lineNumber: 0
        });
      }
    }
  }
  
  // Add interface definitions for objects
  if (refactoredCode.includes('props.') && !refactoredCode.includes('interface')) {
    const interfaceDefinition = `
interface Props {
  // Add prop type definitions here
}

`;
    refactoredCode = interfaceDefinition + refactoredCode;
    changes.push({
      type: 'typing',
      description: 'Added Props interface template',
      lineNumber: 1
    });
    improvements.push('Added TypeScript interface for better type safety');
  }
  
  // Add return type annotations
  const arrowFunctionRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/g;
  if (arrowFunctionRegex.test(refactoredCode) && !refactoredCode.includes(': void') && !refactoredCode.includes(': any')) {
    improvements.push('Consider adding return type annotations to functions');
    changes.push({
      type: 'typing',
      description: 'Consider adding explicit return types',
      lineNumber: 0
    });
  }
  
  return { code: refactoredCode, changes, improvements };
};

const extractComponents = (code: string) => {
  let refactoredCode = code;
  const changes: RefactorResult['changes'] = [];
  const improvements: string[] = [];
  
  // Detect repeated JSX patterns that could be extracted
  const jsxElementRegex = /<(\w+)[^>]*>.*?<\/\1>/gs;
  const jsxElements = refactoredCode.match(jsxElementRegex) || [];
  
  // Simple heuristic: if the same JSX structure appears multiple times
  const elementCounts = new Map<string, number>();
  jsxElements.forEach(element => {
    const tagName = element.match(/<(\w+)/)?.[1];
    if (tagName) {
      elementCounts.set(tagName, (elementCounts.get(tagName) || 0) + 1);
    }
  });
  
  for (const [tagName, count] of elementCounts) {
    if (count > 2 && !['div', 'span', 'p', 'h1', 'h2', 'h3'].includes(tagName)) {
      improvements.push(`Consider extracting repeated <${tagName}> elements into a reusable component`);
      changes.push({
        type: 'extraction',
        description: `Found ${count} instances of <${tagName}> that could be extracted`,
        lineNumber: 0
      });
    }
  }
  
  // Detect long functions that could be broken down
  const functionBodyRegex = /{\s*(.*?)\s*}/gs;
  const functionBodies = refactoredCode.match(functionBodyRegex) || [];
  
  functionBodies.forEach((body, index) => {
    const lineCount = body.split('\n').length;
    if (lineCount > 20) {
      improvements.push(`Consider breaking down large function into smaller components`);
      changes.push({
        type: 'extraction',
        description: `Function has ${lineCount} lines and could be refactored`,
        lineNumber: 0
      });
    }
  });
  
  // Suggest extracting utility functions
  if (refactoredCode.includes('useState') && refactoredCode.includes('useEffect')) {
    improvements.push('Consider extracting complex state logic into custom hooks');
    changes.push({
      type: 'extraction',
      description: 'Complex state management detected - consider custom hooks',
      lineNumber: 0
    });
  }
  
  return { code: refactoredCode, changes, improvements };
};