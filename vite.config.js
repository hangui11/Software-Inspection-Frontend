import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@public': fileURLToPath(new URL('./public', import.meta.url)),
    },
  },
  test: {
    // ⬇️ Add this line
    environment: 'jsdom',
    // Optional: exact imports usually not needed if using 'jsdom' env correctly,
    // but useful if you have globals like describe/it enabled
    globals: true,
  },
})


