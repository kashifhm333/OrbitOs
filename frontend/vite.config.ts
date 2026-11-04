import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

const logger = createLogger();
const originalError = logger.error.bind(logger);

// Suppress normal socket resets (EPIPE / ECONNRESET) that occur when a client browser reloads or closes
logger.error = (msg, options) => {
  if (
    typeof msg === 'string' &&
    msg.includes('ws proxy socket error') &&
    (msg.includes('EPIPE') || msg.includes('ECONNRESET'))
  ) {
    return;
  }
  if (options?.error && (options.error.code === 'EPIPE' || options.error.code === 'ECONNRESET')) {
    return;
  }
  originalError(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'EPIPE' || err?.code === 'ECONNRESET') {
              return;
            }
            console.warn('[vite] ws proxy warning:', err?.message || err);
          });
        },
      },
    },
  },
});
