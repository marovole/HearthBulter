import type { ReactNode } from 'react';

// Mock for next-auth to support ESM imports in Jest
const NextAuth = jest.fn(() => ({
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}));

export default NextAuth;
export const auth = jest.fn().mockResolvedValue({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
});

export const signIn = jest.fn();
export const signOut = jest.fn();
export const signUp = jest.fn();
export const useSession = jest.fn(() => ({
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
  },
  status: 'authenticated',
}));

export const getServerSession = jest.fn().mockResolvedValue({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});

export const SessionProvider = ({ children }: { children: ReactNode }) =>
  children;
