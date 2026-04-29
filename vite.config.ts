import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Proxy API requests to the Express backend during development
      '/api': {
        // Use IPv4 loopback to avoid IPv6 ::1 issues on Windows
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
