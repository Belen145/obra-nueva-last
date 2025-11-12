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
      '/api/hubspot': {
        target: 'https://api.hubapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hubspot/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    },
  },
});
