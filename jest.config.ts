const config = {
  testMatch: ['**.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
  },
};

export default config;
