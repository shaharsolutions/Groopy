import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@firebase/firestore') || id.includes('/firebase/firestore')) return 'firebase-firestore-vendor';
          if (id.includes('@firebase/storage') || id.includes('/firebase/storage')) return 'firebase-storage-vendor';
          if (id.includes('@firebase/auth') || id.includes('/firebase/auth')) return 'firebase-auth-vendor';
          if (id.includes('/firebase/') || id.includes('@firebase/')) return 'firebase-core-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
          if (id.includes('/xlsx/')) return 'xlsx-vendor';
          return 'vendor';
        }
      }
    }
  }
})
