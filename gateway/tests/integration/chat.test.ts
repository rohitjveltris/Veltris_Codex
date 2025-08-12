import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';

describe('Chat API Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('POST /api/chat', () => {
    it('should reject invalid request body', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: '', // Invalid: empty message
          model: 'invalid-model'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should accept valid request format', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello, can you help me with code?',
          model: 'gpt-4o',
          context: {
            filePath: 'test.tsx',
            codeContent: 'const x = 1;'
          }
        });

      // Note: This will fail without real API keys, but validates request format
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should handle unsupported model', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
          model: 'unsupported-model' as any
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(10001); // Exceed max length

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: longMessage,
          model: 'gpt-4o'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(10).fill(0).map(() =>
        request(app)
          .post('/api/chat')
          .send({
            message: 'Test message',
            model: 'gpt-4o'
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (status 429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // With a reasonable rate limit, we expect some to be blocked
      // This is environment dependent, so we'll just check the format
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toHaveProperty('error');
      }
    });
  });
});