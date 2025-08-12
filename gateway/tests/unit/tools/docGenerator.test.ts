import { describe, it, expect } from 'vitest';
import { generateDocumentation } from '../../../src/services/ai/tools/docGenerator.js';

describe('generateDocumentation', () => {
  it('should generate README documentation', async () => {
    const params = {
      docType: 'README' as const,
      projectContext: 'A React-based code editor application',
      codeStructure: 'src/ components/ utils/'
    };

    const result = await generateDocumentation(params);

    expect(result.docType).toBe('README');
    expect(result.content).toContain('# README Documentation');
    expect(result.content).toContain('React-based code editor application');
    expect(result.sections).toContain('Installation');
    expect(result.sections).toContain('Usage');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('should generate BRD documentation', async () => {
    const params = {
      docType: 'BRD' as const,
      projectContext: 'AI-powered coding assistant platform'
    };

    const result = await generateDocumentation(params);

    expect(result.docType).toBe('BRD');
    expect(result.content).toContain('# Business Requirements Document');
    expect(result.sections).toContain('Business Objectives');
    expect(result.sections).toContain('Functional Requirements');
  });

  it('should generate SRD documentation', async () => {
    const params = {
      docType: 'SRD' as const,
      projectContext: 'Web-based development environment'
    };

    const result = await generateDocumentation(params);

    expect(result.docType).toBe('SRD');
    expect(result.content).toContain('# Software Requirements Document');
    expect(result.sections).toContain('System Architecture');
    expect(result.sections).toContain('Technical Requirements');
  });

  it('should generate API_DOCS documentation', async () => {
    const params = {
      docType: 'API_DOCS' as const,
      projectContext: 'REST API for code generation service'
    };

    const result = await generateDocumentation(params);

    expect(result.docType).toBe('API_DOCS');
    expect(result.content).toContain('# API Documentation');
    expect(result.sections).toContain('Endpoints');
    expect(result.sections).toContain('Authentication');
  });

  it('should throw error for unsupported doc type', async () => {
    const params = {
      docType: 'INVALID' as any,
      projectContext: 'Test project'
    };

    await expect(generateDocumentation(params)).rejects.toThrow('Unsupported documentation type');
  });

  it('should include code structure when provided', async () => {
    const params = {
      docType: 'README' as const,
      projectContext: 'Test application',
      codeStructure: 'frontend/ backend/ shared/'
    };

    const result = await generateDocumentation(params);

    expect(result.content).toContain('Code Structure');
    expect(result.content).toContain('frontend/ backend/ shared/');
  });
});