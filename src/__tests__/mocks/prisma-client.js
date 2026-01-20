// eslint-disable-next-line @typescript-eslint/no-require-imports
const { mockPrisma } = require("./supabase-adapter");

const PrismaClient = jest.fn().mockImplementation(() => mockPrisma);

const enumProxy = new Proxy(
  {},
  {
    get: (_target, prop) => String(prop),
  }
);

module.exports = new Proxy(
  { PrismaClient, ...mockPrisma },
  {
    get: (target, prop) => (prop in target ? target[prop] : enumProxy),
  }
);
