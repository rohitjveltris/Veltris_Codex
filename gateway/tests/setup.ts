import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock console methods in tests to avoid cluttering output
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {}
};