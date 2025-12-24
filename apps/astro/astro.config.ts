import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
  ],
  vite: {
    plugins: [tailwindcss() as any],
  },
  server: {
    port: 3001,
  },
  devToolbar: {
    enabled: false,
  },
});
