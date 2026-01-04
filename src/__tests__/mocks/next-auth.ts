// Mock for next-auth to support ESM imports in Jest
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

export const SessionProvider = ({ children }: { children: React.ReactNode }) =>
  children;
