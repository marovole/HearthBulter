/**
 * API测试环境设置
 * 为Next.js API路由测试提供必要的polyfills和mocks
 */

// Mock Web APIs for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
import { URL, URLSearchParams } from 'url';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add URL and URLSearchParams polyfills for Jest
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Mock fetch API
global.fetch = jest.fn();

// Mock Next.js Request and Response
import { NextRequest, NextResponse } from 'next/server';

// Mock Next.js APIs
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init = {}) => ({
    url,
    method: init.method || 'GET',
    headers: new Map(Object.entries(init.headers || {})),
    json: async () => (init.body ? JSON.parse(init.body) : {}),
    text: async () => init.body || '',
    clone: jest.fn(),
  })),
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      status: init.status || 200,
      json: async () => data,
      headers: new Map(Object.entries(init.headers || {})),
    })),
    redirect: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock crypto API
global.crypto = {
  subtle: {
    digest: jest.fn(),
  },
  randomUUID: jest.fn(() => 'test-uuid-12345'),
  randomBytes: jest.fn(() => ({ toString: () => 'random-string' })),
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
};

// Mock WebSocket (if needed)
global.WebSocket = jest.fn();

// Mock File API
global.File = jest.fn();
global.FileReader = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL for blob URLs
if (global.URL && typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
}
if (global.URL && typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = jest.fn();
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.USDA_API_KEY = 'test-usda-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Allow specific error messages that are expected in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
      args[0].includes('Test environment') ||
      args[0].includes('Mock'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  // Allow specific warning messages that are expected in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
      args[0].includes('deprecated') ||
      args[0].includes('Test environment'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Reset all mocks before each test - define only if Jest is available
if (typeof beforeEach !== 'undefined') {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });
}
