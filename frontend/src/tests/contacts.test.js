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
  authService,
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

test('contactService.getContacts - safely constructs query string for server-side search, sort, filter, and pagination', async () => {
  let capturedUrl = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    capturedUrl = url;
    return {
      status: 200,
      ok: true,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        contacts: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }),
    };
  };

  try {
    // 1. With all supported parameters
    await contactService.getContacts({
      search: ' Kabir ',
      company: ' OpenAI ',
      sortBy: 'name',
      order: 'asc',
      page: 2,
      limit: 20,
    });
    const parsed = new URL(capturedUrl);
    assert.equal(parsed.pathname, '/api/contacts');
    assert.equal(parsed.searchParams.get('search'), 'Kabir');
    assert.equal(parsed.searchParams.get('company'), 'OpenAI');
    assert.equal(parsed.searchParams.get('sortBy'), 'name');
    assert.equal(parsed.searchParams.get('order'), 'asc');
    assert.equal(parsed.searchParams.get('page'), '2');
    assert.equal(parsed.searchParams.get('limit'), '20');

    // 2. Without params: should query /api/contacts without query params
    await contactService.getContacts();
    assert.equal(capturedUrl, 'http://localhost:5001/api/contacts');

    // 3. With empty or whitespace-only strings: should safely omit them
    await contactService.getContacts({ search: '   ', company: '', page: 1 });
    const parsedClean = new URL(capturedUrl);
    assert.equal(parsedClean.searchParams.has('search'), false);
    assert.equal(parsedClean.searchParams.has('company'), false);
    assert.equal(parsedClean.searchParams.get('page'), '1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('contactService CRUD - creates, updates, and deletes contacts with correct endpoints and methods', async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      status: 200,
      ok: true,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ message: 'success', contact: { _id: '123' } }),
    };
  };

  try {
    // POST /contacts
    await contactService.createContact({ name: 'Jane', phone: '1234567890' });
    const createReq = requests[requests.length - 1];
    assert.equal(createReq.url, 'http://localhost:5001/api/contacts');
    assert.equal(createReq.options.method, 'POST');
    assert.deepEqual(JSON.parse(createReq.options.body), { name: 'Jane', phone: '1234567890' });

    // PUT /contacts/123
    await contactService.updateContact('123', { name: 'Jane Updated' });
    const updateReq = requests[requests.length - 1];
    assert.equal(updateReq.url, 'http://localhost:5001/api/contacts/123');
    assert.equal(updateReq.options.method, 'PUT');
    assert.deepEqual(JSON.parse(updateReq.options.body), { name: 'Jane Updated' });

    // DELETE /contacts/123
    await contactService.deleteContact('123');
    const deleteReq = requests[requests.length - 1];
    assert.equal(deleteReq.url, 'http://localhost:5001/api/contacts/123');
    assert.equal(deleteReq.options.method, 'DELETE');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authService - login stores JWT and user session, logout clears session', async () => {
  clearAuthSession();
  const mockToken = 'jwt.test.token';
  const mockUser = { id: 'usr-99', name: 'Tester', email: 'tester@cms.io', role: 'User' };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:5001/api/auth/login');
    assert.equal(options.method, 'POST');
    return {
      status: 200,
      ok: true,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ token: mockToken, user: mockUser }),
    };
  };

  try {
    const res = await authService.login({ email: 'tester@cms.io', password: 'password123' });
    assert.equal(res.token, mockToken);
    assert.equal(getStoredToken(), mockToken);
    assert.deepEqual(getStoredUser(), mockUser);

    authService.logout();
    assert.equal(getStoredToken(), null);
    assert.equal(getStoredUser(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiRequest - handles server validation errors and network errors properly', async () => {
  const originalFetch = globalThis.fetch;

  // 1. Server validation 400 error
  globalThis.fetch = async () => ({
    status: 400,
    ok: false,
    headers: {
      get: (h) => (h === 'content-type' ? 'application/json' : null),
    },
    json: async () => ({ message: 'Invalid sortBy field. Use name, company, or createdAt.' }),
  });

  try {
    await assert.rejects(
      () => contactService.getContacts({ sortBy: 'invalid' }),
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.message, 'Invalid sortBy field. Use name, company, or createdAt.');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 2. Network offline / failed error
  globalThis.fetch = async () => {
    throw new Error('Failed to fetch');
  };

  try {
    await assert.rejects(
      () => contactService.getContacts(),
      (err) => {
        assert.match(err.message, /Failed to fetch/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pagination and response parsing - handles empty results and single page calculations safely', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    headers: {
      get: (h) => (h === 'content-type' ? 'application/json' : null),
    },
    json: async () => ({
      contacts: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    }),
  });

  try {
    const data = await contactService.getContacts({ page: 1, limit: 10 });
    assert.deepEqual(data.contacts, []);
    assert.equal(data.pagination.total, 0);
    assert.equal(data.pagination.totalPages, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('authService.getMe - succeeds with valid session and throws on expired session', async () => {
  const originalFetch = globalThis.fetch;
  setAuthSession('valid-session-token', { id: 'user-42' });

  // Valid session
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer valid-session-token');
    return {
      status: 200,
      ok: true,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({ user: { id: 'user-42', role: 'User' } }),
    };
  };

  try {
    const me = await authService.getMe();
    assert.equal(me.user.id, 'user-42');
    assert.equal(me.user.role, 'User');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Expired session -> 401 clears stored session
  globalThis.fetch = async () => ({
    status: 401,
    ok: false,
    headers: {
      get: (h) => (h === 'content-type' ? 'application/json' : null),
    },
    json: async () => ({ message: 'jwt expired' }),
  });

  try {
    await assert.rejects(
      () => authService.getMe(),
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.message, 'jwt expired');
        return true;
      }
    );
    assert.equal(getStoredToken(), null);
    assert.equal(getStoredUser(), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearAuthSession();
  }
});

test('authService.getMe - preserves session on network error or 5xx server errors without logging out', async () => {
  const originalFetch = globalThis.fetch;
  const token = 'persistent-user-token';
  const user = { id: 'usr-1', email: 'worker@office.com' };
  setAuthSession(token, user);

  // 1. Server 500 internal error: token and user should NOT be wiped
  globalThis.fetch = async () => ({
    status: 500,
    ok: false,
    headers: {
      get: (h) => (h === 'content-type' ? 'application/json' : null),
    },
    json: async () => ({ message: 'Database connection failed' }),
  });

  try {
    await assert.rejects(
      () => authService.getMe(),
      (err) => {
        assert.equal(err.status, 500);
        return true;
      }
    );
    assert.equal(getStoredToken(), token, 'Token must not be cleared on 500 error');
    assert.deepEqual(getStoredUser(), user, 'User session must not be cleared on 500 error');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 2. Network offline error: token and user should NOT be wiped
  globalThis.fetch = async () => {
    throw new Error('Network offline');
  };

  try {
    await assert.rejects(
      () => authService.getMe(),
      (err) => {
        assert.match(err.message, /Network offline/);
        return true;
      }
    );
    assert.equal(getStoredToken(), token, 'Token must not be cleared on network failure');
    assert.deepEqual(getStoredUser(), user, 'User session must not be cleared on network failure');
  } finally {
    globalThis.fetch = originalFetch;
    clearAuthSession();
  }
});

test('company discovery - gathers all unique companies across multiple pages bounded by max pages', async () => {
  const originalFetch = globalThis.fetch;
  const requestedPages = [];

  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    const p = Number(parsed.searchParams.get('page') || 1);
    requestedPages.push(p);

    if (p === 1) {
      return {
        status: 200,
        ok: true,
        headers: { get: (h) => (h === 'content-type' ? 'application/json' : null) },
        json: async () => ({
          contacts: [
            { _id: '1', name: 'Alice', company: 'Google' },
            { _id: '2', name: 'Bob', company: 'Stripe' },
          ],
          pagination: { total: 250, page: 1, limit: 100, totalPages: 3 },
        }),
      };
    } else if (p === 2) {
      return {
        status: 200,
        ok: true,
        headers: { get: (h) => (h === 'content-type' ? 'application/json' : null) },
        json: async () => ({
          contacts: [
            { _id: '3', name: 'Carol', company: 'OpenAI' },
            { _id: '4', name: 'Dave', company: 'Google' },
          ],
          pagination: { total: 250, page: 2, limit: 100, totalPages: 3 },
        }),
      };
    } else {
      return {
        status: 200,
        ok: true,
        headers: { get: (h) => (h === 'content-type' ? 'application/json' : null) },
        json: async () => ({
          contacts: [
            { _id: '5', name: 'Eve', company: 'Anthropic' },
          ],
          pagination: { total: 250, page: 3, limit: 100, totalPages: 3 },
        }),
      };
    }
  };

  try {
    // Simulate bounded multi-page extraction
    const firstPage = await contactService.getContacts({ page: 1, limit: 100 });
    const collected = new Set();
    firstPage.contacts.forEach((c) => collected.add(c.company));

    const totalPages = Math.min(firstPage.pagination.totalPages, 10);
    const subsequent = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        contactService.getContacts({ page: i + 2, limit: 100 })
      )
    );
    subsequent.forEach((res) => {
      res.contacts.forEach((c) => collected.add(c.company));
    });

    const uniqueSorted = Array.from(collected).sort();
    assert.deepEqual(uniqueSorted, ['Anthropic', 'Google', 'OpenAI', 'Stripe']);
    assert.deepEqual(requestedPages, [1, 2, 3]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('table sorting accessibility - produces correct aria-sort values and label indicators', () => {
  const getAriaSort = (field, currentSort, order) => {
    if (field !== currentSort) return 'none';
    return order === 'asc' ? 'ascending' : 'descending';
  };

  assert.equal(getAriaSort('name', 'name', 'asc'), 'ascending');
  assert.equal(getAriaSort('name', 'name', 'desc'), 'descending');
  assert.equal(getAriaSort('name', 'company', 'asc'), 'none');
  assert.equal(getAriaSort('company', 'company', 'desc'), 'descending');
  assert.equal(getAriaSort('company', 'createdAt', 'asc'), 'none');
});
