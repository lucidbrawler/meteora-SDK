// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      nodePolyfills({
        protocolImports: true,
        include: ['buffer', 'process'],
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
      }),
    ],

    define: {
      global: 'globalThis',
    },

    optimizeDeps: {
      include: ['@meteora-ag/dlmm', 'bn.js'],
      // Remove exclude so Vite can pre-bundle anchor properly
    },

    ssr: {
      noExternal: ['@meteora-ag/dlmm'],
    },
  },

  integrations: [react()],
});