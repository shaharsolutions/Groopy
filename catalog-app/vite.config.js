import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths to support both Vercel (root) and GitHub Pages (subfolder)
  base: './',
})
