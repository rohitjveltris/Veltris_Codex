import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';

describe('Health API Integration', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      // Should return 200 or 503 depending on service availability
      expect([200, 503]).toContain(response.status);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('services');
      
      // Check status values
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      
      // Check services structure
      const services = response.body.data.services;
      expect(services).toHaveProperty('openai');
      expect(services).toHaveProperty('anthropic');
      expect(typeof services.openai).toBe('boolean');
      expect(typeof services.anthropic).toBe('boolean');
    });

    it('should return version information', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.body.data.version).toBe('1.0.0');
      expect(typeof response.body.data.uptime).toBe('number');
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});