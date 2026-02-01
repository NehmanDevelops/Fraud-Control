import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Vercel sets VERCEL=1 in the build environment
  // On Vercel, use root '/'. On GitHub Pages, use '/Fraud-Control/'
  base: process.env.VERCEL === '1' ? '/' : '/Fraud-Control/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

