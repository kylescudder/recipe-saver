import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@':
        process.env.UI_SOURCE_ROOT ??
        fileURLToPath(new URL('../../src', import.meta.url))
    },
    dedupe: ['react', 'react-dom']
  },
  server: {
    fs: {
      allow: [
        process.cwd(),
        ...(process.env.UI_SOURCE_ROOT
          ? [process.env.UI_SOURCE_ROOT + '/..']
          : [])
      ]
    }
  }
})
