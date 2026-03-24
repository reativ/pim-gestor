import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  // Optimizes lucide-react barrel imports — avoids loading all 1500+ icons in dev
  optimizeDeps: {
    include: ['lucide-react'],
  },
})
