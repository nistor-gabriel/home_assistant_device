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
      '^(/mqtt)': { target: 'http://192.168.4.1'}, // ^(/api)|(/stats)|(/mqtt)|(/wlan) // http://192.168.100.76
    },
  },
})
