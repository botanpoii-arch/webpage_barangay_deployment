import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// vite.config.ts
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0', // Allow phone to connect
    https: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Forward to your backend
        changeOrigin: true,
        secure: false,
      }
    }
  }
})