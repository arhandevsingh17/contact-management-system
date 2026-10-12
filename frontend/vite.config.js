import react from '@vitejs/plugin-react';
import { cwd } from 'node:process';
import { loadEnv, defineConfig } from 'vite';
import { validateProductionApiUrl } from './src/utils/apiUrlConfig.js';

export default defineConfig(({ mode }) => {
  // Load only client-exposed VITE_* keys; do not load unrelated secrets.
  const env = loadEnv(mode, cwd(), 'VITE_');
  validateProductionApiUrl(mode, env);

  return {
    plugins: [react()],
  };
});
