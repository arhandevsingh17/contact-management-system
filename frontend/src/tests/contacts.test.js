import test from 'node:test';
import assert from 'node:assert/strict';

// Test the actual production helper functions imported from utils
import {
  extractContacts,
  filterContacts,
  getUniqueCompanies,
} from '../utils/contactHelpers.js';

// Setup minimal DOM / storage globals to test actual api.js functions
const storage = {};
globalThis.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => {
    storage[key] = String(val);
  },
  removeItem: (key) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
};

let eventDispatched = null;
globalThis.window = {
  dispatchEvent: (ev) => {
    eventDispatched = ev.type;
  },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type) {
    this.type = type;
  }
};

import {
  getStoredToken,
  getStoredUser,
  setAuthSession,
  clearAuthSession,
  apiRequest,
  contactService,
} from '../services/api.js';

test('extractContacts - extracts direct array from backend response', () => {
  const directList = [
    { _id: '1', name: 'Alice', phone: '123' },
    { _id: '2', name: 'Bob', phone: '456' },
  ];
  const result = extractContacts(directList);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'Alice');
});

test('extractContacts - extracts nested array if wrapped in object', () => {
  const wrapped = {
    contacts: [{ _id: '3', name: 'Charlie', phone: '789' }],
  };
  const result = extractContacts(wrapped);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Charlie');
});

test('extractContacts - handles null, undefined, and non-array shapes safely', () => {
  assert.deepEqual(extractContacts(null), []);
  assert.deepEqual(extractContacts(undefined), []);
  assert.deepEqual(extractContacts({}), []);
  assert.deepEqual(extractContacts('string'), []);
});

test('filterContacts - searches across name, email, phone, and company', () => {
  const list = [
    { _id: '1', name: 'Alice Smith', email: 'alice@corp.com', phone: '111-222', company: 'Alpha Inc' },
    { _id: '2', name: 'Bob Jones', email: 'bob@tech.org', phone: '333-444', company: 'Beta Corp' },
    { _id: '3', name: 'Charlie Potter', email: 'potter@magic.co', phone: '555-777', company: 'Alpha Inc' },
  ];

  // Name query
  const byName = filterContacts(list, 'smith', '');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].name, 'Alice Smith');

  // Email query
  const byEmail = filterContacts(list, 'tech.org', '');
  assert.equal(byEmail.length, 1);
  assert.equal(byEmail[0].name, 'Bob Jones');

  // Phone snippet
  const byPhone = filterContacts(list, '555', '');
  assert.equal(byPhone.length, 1);
  assert.equal(byPhone[0].name, 'Charlie Potter');

  // Company filter only
  const byCompany = filterContacts(list, '', 'Alpha Inc');
  assert.equal(byCompany.length, 2);

  // Combined search and company filter
  const combined = filterContacts(list, 'Charlie', 'Alpha Inc');
  assert.equal(combined.length, 1);
  assert.equal(combined[0].name, 'Charlie Potter');

  // Mismatch
  const noMatch = filterContacts(list, 'Bob', 'Alpha Inc');
  assert.equal(noMatch.length, 0);
});

test('getUniqueCompanies - extracts sorted distinct non-empty companies', () => {
  const list = [
    { name: 'A', company: 'Zeta' },
    { name: 'B', company: 'Alpha' },
    { name: 'C', company: 'Zeta' },
    { name: 'D', company: '  ' },
    { name: 'E', company: null },
  ];
  const companies = getUniqueCompanies(list);
  assert.deepEqual(companies, ['Alpha', 'Zeta']);
});

test('auth storage & session lifecycle in api.js', () => {
  clearAuthSession();
  assert.equal(getStoredToken(), null);
  assert.equal(getStoredUser(), null);

  const sampleToken = 'header.payload.signature';
  const sampleUser = { id: 'u1', name: 'Test User', email: 'test@cms.org', role: 'User' };

  setAuthSession(sampleToken, sampleUser);
  assert.equal(getStoredToken(), sampleToken);
  assert.deepEqual(getStoredUser(), sampleUser);

  clearAuthSession();
  assert.equal(getStoredToken(), null);
  assert.equal(getStoredUser(), null);
});

test('apiRequest - handles 401 response by clearing session and firing cms:unauthorized', async () => {
  setAuthSession('valid-test-token', { id: '123' });
  eventDispatched = null;

  // Mock fetch to simulate 401 Unauthorized
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      status: 401,
      ok: false,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ message: 'Token is invalid or expired' }),
    };
  };

  try {
    await assert.rejects(
      () => apiRequest('/contacts'),
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.message, 'Token is invalid or expired');
        return true;
      }
    );

    assert.equal(getStoredToken(), null, 'Stored token should be cleared on 401');
    assert.equal(eventDispatched, 'cms:unauthorized', 'cms:unauthorized event should be dispatched');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiRequest - attaches Bearer token header when present in session', async () => {
  const token = 'my-secret-bearer-token';
  setAuthSession(token, { id: 'user-1' });

  let capturedHeaders = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    capturedHeaders = options.headers;
    return {
      status: 200,
      ok: true,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => [{ _id: 'c1', name: 'Verified' }],
    };
  };

  try {
    const data = await contactService.getContacts();
    assert.equal(capturedHeaders.Authorization, `Bearer ${token}`);
    assert.equal(data.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearAuthSession();
  }
});
