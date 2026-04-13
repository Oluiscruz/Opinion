import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: { outDir: "build"},
  server: {
    proxy: {
      "/auth": "http://localhost:8000",
      "/api": "http://localhost:8000",
      "/analysis": "http://localhost:8000",
    },
  },
})
