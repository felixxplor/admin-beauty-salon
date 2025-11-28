import dotenv from 'dotenv'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

dotenv.config()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    port: 3000,
    host: '0.0.0.0',
  },
  define: {
    'process.env': process.env,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    base: './',
    minify: 'esbuild', // Hoặc xóa dòng này, vì esbuild là default
    sourcemap: false,
  },
})
