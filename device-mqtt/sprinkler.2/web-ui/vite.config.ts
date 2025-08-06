import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    mainFields: [],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
      proxy: {
      '^/(api|stats|mqtt|wlan|switch.*|fs.*)$': { target: 'http://192.168.100.76'}, // ^/(api|stats|mqtt|wlan|fs)$ // http://192.168.100.76 http://192.168.4.1
    },
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]',
        entryFileNames: 'index.js',
      }
    }
  },
});
