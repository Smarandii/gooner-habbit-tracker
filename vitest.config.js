import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'happy-dom'
    globals: true,
    setupFiles: [], // if you need setup files
  },
});
