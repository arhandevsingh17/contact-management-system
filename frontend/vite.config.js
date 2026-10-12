import react from '@vitejs/plugin-react';
import { loadEnv, defineConfig } from 'vite';
import { validateProductionApiUrl } from './src/utils/apiUrlConfig.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  validateProductionApiUrl(mode, env);

  return {
    plugins: [react()],
  };
});
