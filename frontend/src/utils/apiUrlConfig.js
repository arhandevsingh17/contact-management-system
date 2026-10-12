import { isIP } from 'node:net';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return LOOPBACK_HOSTS.has(normalized) ||
    normalized.endsWith('.localhost') ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

/**
 * Validate the frontend's API base URL before creating a production bundle.
 * The app appends endpoint paths such as /contacts, so the base must end in /api.
 */
export function validateProductionApiUrl(mode, env = {}) {
  const rawValue = typeof env.VITE_API_URL === 'string'
    ? env.VITE_API_URL.trim()
    : '';

  if (mode !== 'production') {
    return rawValue;
  }

  if (!rawValue) {
    throw new Error(
      'VITE_API_URL is required for production builds. Set it to the deployed backend API base URL, for example https://api.example.com/api.'
    );
  }

  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error('VITE_API_URL must be an absolute HTTPS URL ending in /api.');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname.replace(/\/+$/, '').split('/').pop() !== 'api'
  ) {
    throw new Error(
      'Production VITE_API_URL must be an HTTPS API base URL ending in /api, without credentials, query parameters, or a fragment.'
    );
  }

  if (isIP(hostname) || isLoopbackHostname(hostname)) {
    throw new Error(
      'Production VITE_API_URL must use the deployed backend hostname, not localhost or an IP literal.'
    );
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, '');
}
