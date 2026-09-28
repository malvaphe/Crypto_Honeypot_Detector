import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the API server (npm start, port 8080) is reached through the proxy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: { '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080' },
  },
});
