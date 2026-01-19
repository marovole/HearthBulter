export const auth = jest.fn().mockResolvedValue({
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "USER",
  },
});

export const getCurrentUser = jest.fn().mockResolvedValue({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  role: "USER",
});

export const testAuthSystem = jest.fn().mockResolvedValue({
  healthy: true,
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "USER",
  },
  error: null,
  timestamp: new Date().toISOString(),
});

export const checkAuthConfiguration = jest.fn().mockResolvedValue({
  configured: true,
  issues: [],
  timestamp: new Date().toISOString(),
});

export default {
  auth,
  getCurrentUser,
  testAuthSystem,
  checkAuthConfiguration,
};
