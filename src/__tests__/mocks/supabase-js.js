const createQueryBuilder = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") {
          return undefined;
        }
        return jest.fn().mockReturnValue(createQueryBuilder());
      },
    },
  );

const createClient = () => {
  const queryBuilder = createQueryBuilder();
  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: null, error: null }),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: null, error: null }),
      refreshSession: jest.fn().mockResolvedValue({ data: null, error: null }),
      resetPasswordForEmail: jest
        .fn()
        .mockResolvedValue({ data: null, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: null, error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: null, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: null } })),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: "" } }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };
};

class SupabaseClient {}

module.exports = {
  createClient: jest.fn(() => createClient()),
  SupabaseClient,
};
