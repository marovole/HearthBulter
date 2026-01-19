const enumProxy = new Proxy(
  {},
  {
    get: (_target, prop) => String(prop),
  },
);

const createDelegate = () =>
  new Proxy(
    {},
    {
      get: () => jest.fn().mockResolvedValue(undefined),
    },
  );

const PrismaClient = jest.fn().mockImplementation(
  () =>
    new Proxy(
      {},
      {
        get: () => createDelegate(),
      },
    ),
);

module.exports = new Proxy(
  { PrismaClient },
  {
    get: (target, prop) => (prop in target ? target[prop] : enumProxy),
  },
);
