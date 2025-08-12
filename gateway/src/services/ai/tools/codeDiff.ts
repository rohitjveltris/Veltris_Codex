import { diffLines, diffChars } from 'diff';
import { CodeDiffParams, CodeDiffResult } from '@/types/tools.js';

export const generateCodeDiff = async (params: CodeDiffParams): Promise<CodeDiffResult> => {
  const { oldCode, newCode, language } = params;
  
  // Use line-based diff for better readability
  const lineDiffs = diffLines(oldCode, newCode);
  
  const diffs: CodeDiffResult['diffs'] = [];
  let currentLineNumber = 1;
  let linesAdded = 0;
  let linesRemoved = 0;
  let linesChanged = 0;

  for (const part of lineDiffs) {
    const lines = part.value.split('\n').filter(line => line !== '');
    
    if (part.added) {
      linesAdded += lines.length;
      lines.forEach(line => {
        diffs.push({
          type: 'added',
          content: line,
          lineNumber: currentLineNumber++
        });
      });
    } else if (part.removed) {
      linesRemoved += lines.length;
      lines.forEach(line => {
        diffs.push({
          type: 'removed',
          content: line,
          lineNumber: currentLineNumber
        });
      });
      // Don't increment line number for removed lines
    } else {
      // Unchanged lines
      lines.forEach(line => {
        diffs.push({
          type: 'unchanged',
          content: line,
          lineNumber: currentLineNumber++
        });
      });
    }
  }

  // Calculate changed lines (lines that were both removed and added)
  linesChanged = Math.min(linesAdded, linesRemoved);

  return {
    diffs,
    summary: {
      linesAdded,
      linesRemoved,
      linesChanged
    }
  };
};