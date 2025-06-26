module.exports = {
  preset: 'ts-jest',       // omit or change if pure JS
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.+(ts|js)', '**/?(*.)+(spec|test).+(ts|js)']
};
