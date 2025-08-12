import { describe, it, expect } from 'vitest';
import { generateCodeDiff } from '../../../src/services/ai/tools/codeDiff.js';

describe('generateCodeDiff', () => {
  it('should generate diff for added lines', async () => {
    const oldCode = 'function hello() {\n  console.log("hello");\n}';
    const newCode = 'function hello() {\n  console.log("hello");\n  console.log("world");\n}';

    const result = await generateCodeDiff({ oldCode, newCode });

    expect(result.summary.linesAdded).toBeGreaterThan(0);
    expect(result.diffs).toHaveLength(3);
    expect(result.diffs.some(d => d.type === 'added')).toBe(true);
  });

  it('should generate diff for removed lines', async () => {
    const oldCode = 'function hello() {\n  console.log("hello");\n  console.log("world");\n}';
    const newCode = 'function hello() {\n  console.log("hello");\n}';

    const result = await generateCodeDiff({ oldCode, newCode });

    expect(result.summary.linesRemoved).toBeGreaterThan(0);
    expect(result.diffs.some(d => d.type === 'removed')).toBe(true);
  });

  it('should handle identical code', async () => {
    const code = 'function hello() {\n  console.log("hello");\n}';

    const result = await generateCodeDiff({ oldCode: code, newCode: code });

    expect(result.summary.linesAdded).toBe(0);
    expect(result.summary.linesRemoved).toBe(0);
    expect(result.diffs.every(d => d.type === 'unchanged')).toBe(true);
  });

  it('should include language parameter', async () => {
    const oldCode = 'const x = 1;';
    const newCode = 'const x = 2;';

    const result = await generateCodeDiff({ 
      oldCode, 
      newCode, 
      language: 'typescript' 
    });

    expect(result).toBeDefined();
    expect(result.diffs).toBeDefined();
  });
});