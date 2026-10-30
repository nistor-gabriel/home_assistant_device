import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import importer from 'vite-plugin-importer';

export default defineConfig({
  plugins: [
    react(),
    importer({
      libraryName: 'lucide-react',
      libraryDirectory: 'dist/esm/icons',
      camel2DashComponentName: true,
      style: false
    })],
  resolve: {
    mainFields: [],
    alias: {
      '@': path.resolve(__dirname, '../../lib/web-ui/src'),
    },
  },
  server: {
    proxy: {
      '^/(api|stats|mqtt|wlan|log|pump.*|switch.*|fs.*)$': { target: 'http://192.168.100.130' }, // ^/(api|stats|mqtt|wlan|fs)$ // http://192.168.100.76 http://192.168.4.1
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
  esbuild: { legalComments: 'none' },
});
