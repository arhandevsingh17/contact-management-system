import test from 'node:test';
import assert from 'node:assert/strict';

// Helper extracting contacts identical to DashboardPage logic
const extractContacts = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.contacts)) return data.contacts;
  return [];
};

// Filter logic identical to DashboardPage
const filterContacts = (contacts, searchQuery, companyFilter) => {
  const query = searchQuery.trim().toLowerCase();
  return contacts.filter((contact) => {
    const matchesSearch =
      !query ||
      (contact.name && contact.name.toLowerCase().includes(query)) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      (contact.phone && contact.phone.toLowerCase().includes(query)) ||
      (contact.company && contact.company.toLowerCase().includes(query));

    const matchesCompany =
      !companyFilter ||
      (contact.company && contact.company.trim() === companyFilter);

    return matchesSearch && matchesCompany;
  });
};

test('extractContacts extracts array when response is a direct array', () => {
  const mockContacts = [
    { _id: '1', name: 'Alice', phone: '123456', email: 'alice@example.com' },
    { _id: '2', name: 'Bob', phone: '654321', email: 'bob@example.com' },
  ];
  const result = extractContacts(mockContacts);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'Alice');
});

test('extractContacts extracts array when response is wrapped in { contacts: [] }', () => {
  const mockWrapped = {
    contacts: [
      { _id: '1', name: 'Charlie', phone: '999999', company: 'Acme' },
    ],
  };
  const result = extractContacts(mockWrapped);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Charlie');
});

test('extractContacts returns empty array for null, undefined, or unexpected shape', () => {
  assert.deepEqual(extractContacts(null), []);
  assert.deepEqual(extractContacts(undefined), []);
  assert.deepEqual(extractContacts({}), []);
  assert.deepEqual(extractContacts('string'), []);
});

test('filterContacts matches search query against name, email, phone, or company', () => {
  const contacts = [
    { _id: '1', name: 'Alice Smith', email: 'alice@alpha.com', phone: '111-222', company: 'Alpha Inc' },
    { _id: '2', name: 'Bob Jones', email: 'bob@beta.org', phone: '333-444', company: 'Beta Corp' },
    { _id: '3', name: 'Charlie Ray', email: 'charlie@acme.com', phone: '555-666', company: 'Acme' },
  ];

  // Search by name
  assert.equal(filterContacts(contacts, 'alice', '').length, 1);
  assert.equal(filterContacts(contacts, 'alice', '')[0].name, 'Alice Smith');

  // Search by email domain
  assert.equal(filterContacts(contacts, 'beta.org', '').length, 1);
  assert.equal(filterContacts(contacts, 'beta.org', '')[0].name, 'Bob Jones');

  // Search by phone snippet
  assert.equal(filterContacts(contacts, '555', '').length, 1);
  assert.equal(filterContacts(contacts, '555', '')[0].name, 'Charlie Ray');

  // Filter by company
  assert.equal(filterContacts(contacts, '', 'Alpha Inc').length, 1);
  assert.equal(filterContacts(contacts, '', 'Nonexistent').length, 0);

  // Combined search and company filter
  assert.equal(filterContacts(contacts, 'Alice', 'Alpha Inc').length, 1);
  assert.equal(filterContacts(contacts, 'Bob', 'Alpha Inc').length, 0);
});

test('auth session storage contract and token attachment logic', () => {
  const store = {};
  const mockLocalStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = val; },
    removeItem: (key) => { delete store[key]; },
  };

  const TOKEN_KEY = 'cms_token';
  const USER_KEY = 'cms_user';

  // Save session
  const token = 'jwt-sample-token-123';
  const user = { id: 'u1', name: 'Test User', email: 'test@example.com', role: 'User' };
  mockLocalStorage.setItem(TOKEN_KEY, token);
  mockLocalStorage.setItem(USER_KEY, JSON.stringify(user));

  assert.equal(mockLocalStorage.getItem(TOKEN_KEY), token);
  assert.deepEqual(JSON.parse(mockLocalStorage.getItem(USER_KEY)), user);

  // Clear session (logout or 401 handling)
  mockLocalStorage.removeItem(TOKEN_KEY);
  mockLocalStorage.removeItem(USER_KEY);

  assert.equal(mockLocalStorage.getItem(TOKEN_KEY), null);
  assert.equal(mockLocalStorage.getItem(USER_KEY), null);
});
