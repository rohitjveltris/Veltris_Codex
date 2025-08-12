import { describe, it, expect } from 'vitest';
import { analyzeCodeStructure } from '../../../src/services/ai/tools/codeAnalyzer.js';

describe('analyzeCodeStructure', () => {
  it('should analyze React component structure', async () => {
    const codeContent = `
import React, { useState } from 'react';

interface Props {
  title: string;
}

const MyComponent = ({ title }: Props) => {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Count: {count}</button>
    </div>
  );
};

export default MyComponent;
    `;

    const result = await analyzeCodeStructure({
      filePath: 'src/components/MyComponent.tsx',
      codeContent
    });

    expect(result.structure.functions).toContain('handleClick');
    expect(result.structure.imports).toContain('react');
    expect(result.structure.exports).toContain('MyComponent');
    expect(result.metrics.linesOfCode).toBeGreaterThan(0);
    expect(result.patterns).toContain('React Component');
    expect(result.patterns).toContain('React Hooks');
  });

  it('should analyze Node.js module structure', async () => {
    const codeContent = `
const express = require('express');
const app = express();

function setupRoutes() {
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello World' });
  });
}

class DatabaseManager {
  constructor() {
    this.connection = null;
  }
  
  connect() {
    // Connection logic
  }
}

module.exports = { setupRoutes, DatabaseManager };
    `;

    const result = await analyzeCodeStructure({
      filePath: 'src/server.js',
      codeContent
    });

    expect(result.structure.functions).toContain('setupRoutes');
    expect(result.structure.classes).toContain('DatabaseManager');
    expect(result.patterns).toContain('Node.js Module');
    expect(result.patterns).toContain('Express.js Route Handler');
  });

  it('should provide complexity metrics', async () => {
    const complexCode = `
function complexFunction(x) {
  if (x > 0) {
    for (let i = 0; i < x; i++) {
      if (i % 2 === 0) {
        console.log('even');
      } else {
        console.log('odd');
      }
    }
  } else if (x < 0) {
    while (x < 0) {
      x++;
    }
  }
  return x;
}
    `;

    const result = await analyzeCodeStructure({
      filePath: 'complex.js',
      codeContent: complexCode
    });

    expect(result.metrics.complexity).toBeGreaterThan(1);
    expect(result.metrics.maintainabilityScore).toBeLessThan(100);
  });

  it('should generate relevant suggestions', async () => {
    const poorCode = `
// TODO: Fix this function
function veryLongFunctionWithManyLines() {
  console.log('line 1');
  console.log('line 2');
  console.log('line 3');
  // ... many more lines would be here in real scenario
  var oldVar = 'old style';
  // FIXME: This is broken
}
    `;

    const result = await analyzeCodeStructure({
      filePath: 'poor.js',
      codeContent: poorCode
    });

    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TODO')
      ])
    );
  });

  it('should detect async patterns', async () => {
    const asyncCode = `
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}
    `;

    const result = await analyzeCodeStructure({
      filePath: 'async.js',
      codeContent: asyncCode
    });

    expect(result.patterns).toContain('Async/Await Pattern');
    expect(result.structure.functions).toContain('fetchData');
  });
});