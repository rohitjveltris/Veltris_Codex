import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';

describe('Models API Integration', () => {
  describe('GET /api/models', () => {
    it('should return available models', async () => {
      const response = await request(app)
        .get('/api/models');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('models');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('available');
      
      // Check model structure
      const models = response.body.data.models;
      expect(Array.isArray(models)).toBe(true);
      
      if (models.length > 0) {
        const model = models[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('capabilities');
        expect(model).toHaveProperty('available');
      }
    });

    it('should include expected models', async () => {
      const response = await request(app)
        .get('/api/models');

      expect(response.status).toBe(200);
      
      const models = response.body.data.models;
      const modelIds = models.map((m: any) => m.id);
      
      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('claude-3.5-sonnet');
    });
  });
});