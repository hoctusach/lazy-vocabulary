// Non-functional (budget) tests. Kept out of the default `vitest run` (they match *.nfr.ts, not *.test.ts).
// Run: npm run test:nfr:perf  (single worker so timings are not distorted by parallel test files).
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  define: { __APP_VERSION__: JSON.stringify('nfr') },
  test: {
    include: ['tests/nfr/**/*.nfr.ts', 'tests/nfr/**/*.nfr.tsx'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true, execArgv: ['--expose-gc'] } },
    testTimeout: 120000,
    reporters: ['default'],
  },
});
