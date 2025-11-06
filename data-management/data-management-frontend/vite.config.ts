import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/auth': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/batches': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/bananas': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/metadata': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/image': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/banana': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/batch': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/analytics': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
          '/gcs-signed-read-url': {
            target: 'http://data-ingestion-backend:8080',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
