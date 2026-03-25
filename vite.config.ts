import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import fs from 'fs'

const version = fs.readFileSync('./VERSION', 'utf-8').trim()

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  base: '/',
  publicDir: 'docs',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/main-' + version + '.js',
        chunkFileNames: 'assets/[name]-' + version + '.js',
        assetFileNames: 'assets/[name]-' + version + '.[ext]',
      },
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}))
