import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production build outputs to dist/ - upload the CONTENTS of dist/
// (not the folder itself) to your InfinityFree htdocs/ root, alongside
// the api/ folder from the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
