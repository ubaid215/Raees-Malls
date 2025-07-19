import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [
        autoprefixer({
          overrideBrowserslist: ['iOS >= 10', 'Safari >= 10']
        })
      ]
    }
  },
  server: {
    hmr: {
      overlay: true
    }
  }
})