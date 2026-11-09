import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import { defineConfig } from 'vite';
import { apiRouter } from './server/api.ts';

const apiApp = express();
apiApp.use(express.json({ limit: '8mb' }));
apiApp.use('/api', apiRouter);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'crm-api-server',
        configureServer(server) {
          server.middlewares.use(apiApp);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: true,
    },
  };
});
