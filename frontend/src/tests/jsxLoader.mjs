import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transformWithOxc } from 'vite';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      for (const ext of ['.jsx', '.js']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {
          // ignore and try next
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    const code = await fs.readFile(filePath, 'utf8');
    const result = await transformWithOxc(code, filePath, {});
    return {
      format: 'module',
      shortCircuit: true,
      source: result.code,
    };
  }
  return nextLoad(url, context);
}
