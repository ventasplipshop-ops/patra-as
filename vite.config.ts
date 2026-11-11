import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: 'node_modules/.vite-plip',
  plugins: [react()],
  server: process.env.PLIP_DEV_API_TARGET ? {
    proxy: {
      '/api/transferencias': {
        target: process.env.PLIP_DEV_API_TARGET,
        changeOrigin: false,
      },
    },
  } : undefined,
})
