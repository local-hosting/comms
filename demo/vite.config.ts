import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const demoRoot = path.dirname(fileURLToPath(import.meta.url))
const commsRoot = path.resolve(demoRoot, '..')

export default defineConfig({
  root: demoRoot,
  plugins: [tailwindcss()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  resolve: {
    alias: {
      '@local-hosting/compose': path.resolve(commsRoot, '../compose/dist/index.js'),
      '@local-hosting/frames': path.resolve(commsRoot, '../frames/dist/core.js'),
    },
  },
  server: {
    fs: {
      allow: [commsRoot, path.resolve(commsRoot, '..')],
    },
  },
})