import adapter from '@sveltejs/adapter-auto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    alias: {
      $components: resolve(__dirname, 'src/lib/components'),
      $icons: resolve(__dirname, 'src/icons')
    }
  }
};

export default config;
