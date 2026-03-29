import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      pool: 'threads',
      exclude: ['tests/e2e/**', 'tests/firestore.rules.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html']
      }
    }
  })
);
