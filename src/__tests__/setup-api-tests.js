/**
 * API测试环境设置
 * 为Next.js API路由测试提供必要的polyfills和mocks
 */

// Mock Web APIs for Node.js environment
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch API
global.fetch = jest.fn();

// Mock Request and Response
global.Request = jest.fn();
global.Response = jest.fn();

// Mock crypto API
global.crypto = {
  subtle: {
    digest: jest.fn()
  },
  randomUUID: jest.fn(() => 'test-uuid-12345')
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock WebSocket (if needed)
global.WebSocket = jest.fn();

// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';