type CredentialsConfig = {
  name?: string;
  credentials?: Record<string, unknown>;
  authorize?: (
    credentials: Record<string, unknown> | undefined,
  ) => Promise<unknown> | unknown;
};

const CredentialsProvider = jest.fn((options: CredentialsConfig = {}) => ({
  id: 'credentials',
  name: options.name ?? 'credentials',
  credentials: options.credentials ?? {},
  authorize: options.authorize,
}));

export default CredentialsProvider;
