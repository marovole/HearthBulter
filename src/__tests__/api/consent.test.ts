/**
 * AI Consent API 测试
 */

import { POST, GET } from '@/app/api/ai/consent/route';

// Mock the user service
jest.mock('@/lib/services/user', () => ({
  userService: {
    updateAIConsent: jest.fn().mockResolvedValue({
      userId: 'test-user-id',
      consent: true,
      timestamp: new Date(),
    }),
    getAIConsent: jest.fn().mockResolvedValue({
      consent: true,
      timestamp: new Date(),
    }),
  },
}));

// Mock authentication
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }),
}));

describe('/api/ai/consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should update AI consent successfully', async () => {
      const requestBody = { consent: true };
      const request = new Request('http://localhost:3000/api/ai/consent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('consent', true);
      expect(data.data).toHaveProperty('timestamp');
    });

    it('should handle invalid request body', async () => {
      const requestBody = { invalid: 'data' };
      const request = new Request('http://localhost:3000/api/ai/consent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });

    it('should handle unauthenticated requests', async () => {
      // Mock unauthenticated session
      jest.doMock('next-auth/next', () => ({
        getServerSession: jest.fn().mockResolvedValue(null),
      }));

      const requestBody = { consent: true };
      const request = new Request('http://localhost:3000/api/ai/consent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET', () => {
    it('should retrieve current AI consent status', async () => {
      const request = new Request('http://localhost:3000/api/ai/consent');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('consent');
      expect(data.data).toHaveProperty('timestamp');
    });
  });
});