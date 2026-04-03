import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use '/' for Vercel/Local and '/Groopy/' for GitHub Pages
  base: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '/Groopy/' : '/',
})
