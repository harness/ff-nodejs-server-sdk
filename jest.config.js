module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[tj]s$',
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['src/openapi/'],
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
};
