import { defineConfig } from 'astro/config';
import lit from '@astrojs/lit';

export default defineConfig({
  integrations: [lit()],
  output: 'static',
  outDir: 'dist',
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(Date.now().toString()),
    },
  },
});
