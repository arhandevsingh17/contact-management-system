import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionApiUrl } from '../utils/apiUrlConfig.js';

test('development may omit VITE_API_URL and use the local fallback', () => {
  assert.equal(validateProductionApiUrl('development', {}), '');
});

test('production requires VITE_API_URL', () => {
  assert.throws(
    () => validateProductionApiUrl('production', {}),
    /VITE_API_URL is required for production builds/
  );
});

test('production accepts a deployed HTTPS API URL ending in /api', () => {
  assert.equal(
    validateProductionApiUrl('production', {
      VITE_API_URL: 'https://api.example.com/api/',
    }),
    'https://api.example.com/api'
  );
});

test('production rejects HTTP, localhost, and IP literal API URLs', () => {
  for (const url of [
    'http://api.example.com/api',
    'https://localhost:5001/api',
    'https://127.0.0.1:5001/api',
    'https://192.0.2.10/api',
  ]) {
    assert.throws(
      () => validateProductionApiUrl('production', { VITE_API_URL: url }),
      /Production VITE_API_URL/
    );
  }
});

test('production rejects URLs with credentials, query, fragment, or wrong API path', () => {
  for (const url of [
    'https://user:password@api.example.com/api',
    'https://api.example.com/api?debug=true',
    'https://api.example.com/api#fragment',
    'https://api.example.com',
  ]) {
    assert.throws(
      () => validateProductionApiUrl('production', { VITE_API_URL: url }),
      /Production VITE_API_URL/
    );
  }
});
