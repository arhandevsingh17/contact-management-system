import react from '@vitejs/plugin-react';
import { cwd } from 'node:process';
import { loadEnv, defineConfig } from 'vite';
import { validateProductionApiUrl } from './src/utils/apiUrlConfig.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '');
  validateProductionApiUrl(mode, env);

  return {
    plugins: [react()],
  };
});
