import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

// 1. Setup JSDOM environment for real React DOM testing
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.HTMLFormElement = dom.window.HTMLFormElement;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.localStorage = dom.window.localStorage;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// 2. Register JSX loader for Node test runner
const loaderUrl = pathToFileURL(new URL('./jsxLoader.mjs', import.meta.url).pathname).href;
register(loaderUrl, import.meta.url);

// 3. Dynamic import of React & Testing Library AFTER DOM globals are bound
const React = (await import('react')).default;
const { render, fireEvent, screen, waitFor, cleanup } = await import('@testing-library/react');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');

const { LoginPage } = await import('../pages/LoginPage.jsx');
const { RegisterPage } = await import('../pages/RegisterPage.jsx');
const { DashboardPage } = await import('../pages/DashboardPage.jsx');
const { ContactModal } = await import('../components/ContactModal.jsx');
const { ProtectedRoute, PublicRoute } = await import('../components/ProtectedRoute.jsx');
const { AuthProvider } = await import('../context/AuthContext.jsx');
const { authService, contactService, clearAuthSession } = await import('../services/api.js');

// Save original services
const originalAuthService = { ...authService };
const originalContactService = { ...contactService };

beforeEach(() => {
  cleanup();
  clearAuthSession();
  globalThis.localStorage.clear();
  Object.assign(authService, originalAuthService);
  Object.assign(contactService, originalContactService);
});

afterEach(() => {
  cleanup();
  clearAuthSession();
  globalThis.localStorage.clear();
  Object.assign(authService, originalAuthService);
  Object.assign(contactService, originalContactService);
});

// Helper to render inside router and auth provider
const renderWithAuth = (ui, initialEntries = ['/']) => {
  return render(
    React.createElement(MemoryRouter, { initialEntries },
      React.createElement(AuthProvider, null, ui)
    )
  );
};

// ============================================================================
// 1. LOGIN WORKFLOW TESTS: Real Form Validation, API Error, Submission
// ============================================================================

test('workflow: LoginPage displays validation errors on submit with empty fields', () => {
  renderWithAuth(React.createElement(LoginPage), ['/login']);

  const submitBtn = screen.getByRole('button', { name: 'Log In' });
  fireEvent.click(submitBtn);

  assert.ok(screen.getByText('Email is required'));
  assert.ok(screen.getByText('Password is required'));
});

test('workflow: LoginPage validates email format', () => {
  renderWithAuth(React.createElement(LoginPage), ['/login']);

  const emailInput = screen.getByLabelText(/Email Address/i);
  const passwordInput = screen.getByLabelText(/Password/i);
  const submitBtn = screen.getByRole('button', { name: 'Log In' });

  fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.click(submitBtn);

  assert.ok(screen.getByText('Please enter a valid email address'));
});

test('workflow: LoginPage displays server API error feedback when login fails', async () => {
  authService.login = async () => {
    throw new Error('Invalid email or password');
  };

  renderWithAuth(React.createElement(LoginPage), ['/login']);

  const emailInput = screen.getByLabelText(/Email Address/i);
  const passwordInput = screen.getByLabelText(/Password/i);
  const submitBtn = screen.getByRole('button', { name: 'Log In' });

  fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
  fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
  fireEvent.click(submitBtn);

  await waitFor(() => {
    assert.ok(screen.getByText('Invalid email or password'));
  });
});

test('workflow: LoginPage successfully submits credentials and stores auth session', async () => {
  let submittedPayload = null;
  authService.login = async (creds) => {
    submittedPayload = creds;
    globalThis.localStorage.setItem('cms_token', 'mock-jwt-token');
    globalThis.localStorage.setItem('cms_user', JSON.stringify({ id: 'u1', name: 'Test User' }));
    return { token: 'mock-jwt-token', user: { id: 'u1', name: 'Test User' } };
  };

  renderWithAuth(React.createElement(LoginPage), ['/login']);

  fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  await waitFor(() => {
    assert.deepEqual(submittedPayload, { email: 'test@example.com', password: 'secret123' });
    assert.equal(globalThis.localStorage.getItem('cms_token'), 'mock-jwt-token');
  });
});

// ============================================================================
// 2. REGISTER WORKFLOW TESTS: Validation, Password Rules, API Error & Success
// ============================================================================

test('workflow: RegisterPage displays validation errors for missing fields', () => {
  renderWithAuth(React.createElement(RegisterPage), ['/register']);

  const registerBtn = screen.getByRole('button', { name: 'Register' });
  fireEvent.click(registerBtn);

  assert.ok(screen.getByText('Name is required'));
  assert.ok(screen.getByText('Email is required'));
  assert.ok(screen.getByText('Password is required'));
});

test('workflow: RegisterPage validates short password and password mismatch', () => {
  renderWithAuth(React.createElement(RegisterPage), ['/register']);

  const nameInput = screen.getByLabelText(/Full Name/i);
  const emailInput = screen.getByLabelText(/Email Address/i);
  const passwordInput = screen.getByLabelText(/^Password/i);
  const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
  const registerBtn = screen.getByRole('button', { name: 'Register' });

  fireEvent.change(nameInput, { target: { value: 'John' } });
  fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
  fireEvent.change(passwordInput, { target: { value: '123' } });
  fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
  fireEvent.click(registerBtn);

  assert.ok(screen.getByText('Password must be at least 6 characters'));

  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
  fireEvent.click(registerBtn);

  assert.ok(screen.getByText('Passwords do not match'));
});

test('workflow: RegisterPage displays API error banner when email is already registered', async () => {
  authService.register = async () => {
    throw new Error('A user with this email already exists');
  };

  renderWithAuth(React.createElement(RegisterPage), ['/register']);

  fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Alice' } });
  fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'existing@example.com' } });
  fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'secret123' } });
  fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));

  await waitFor(() => {
    assert.ok(screen.getByText('A user with this email already exists'));
  });
});

test('workflow: RegisterPage successfully submits and redirects to login with success banner', async () => {
  authService.register = async () => ({ message: 'User created' });

  render(
    React.createElement(MemoryRouter, { initialEntries: ['/register'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/register', element: React.createElement(RegisterPage) }),
          React.createElement(Route, { path: '/login', element: React.createElement(LoginPage) })
        )
      )
    )
  );

  fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'New User' } });
  fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'newuser@example.com' } });
  fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));

  await waitFor(() => {
    assert.ok(screen.getByText(/Registration successful! Please log in/i));
  });
});

// ============================================================================
// 3. ROUTING & ACCESS CONTROL: Protected and Public Route Redirects
// ============================================================================

test('workflow: ProtectedRoute redirects unauthenticated visitors to login', () => {
  globalThis.localStorage.clear();

  render(
    React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/login', element: React.createElement('div', null, 'LOGIN_VIEW_SHOWN') }),
          React.createElement(Route, { element: React.createElement(ProtectedRoute) },
            React.createElement(Route, { path: '/dashboard', element: React.createElement('div', null, 'PROTECTED_SECRET') })
          )
        )
      )
    )
  );

  assert.ok(screen.getByText('LOGIN_VIEW_SHOWN'));
  assert.equal(screen.queryByText('PROTECTED_SECRET'), null);
});

test('workflow: ProtectedRoute displays loading state during session initialization', () => {
  globalThis.localStorage.setItem('cms_token', 'mock-token');
  // Pending getMe that does not resolve immediately
  authService.getMe = () => new Promise(() => {});

  render(
    React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { element: React.createElement(ProtectedRoute) },
            React.createElement(Route, { path: '/dashboard', element: React.createElement('div', null, 'SECRET') })
          )
        )
      )
    )
  );

  assert.ok(screen.getByText(/Verifying session\.\.\./));
  assert.equal(screen.queryByText('SECRET'), null);
});

test('workflow: ProtectedRoute renders protected content when authenticated', async () => {
  globalThis.localStorage.setItem('cms_token', 'valid-token');
  authService.getMe = async () => ({ user: { id: 'u1', name: 'Alice' } });

  render(
    React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { element: React.createElement(ProtectedRoute) },
            React.createElement(Route, { path: '/dashboard', element: React.createElement('div', null, 'PROTECTED_DASHBOARD_CONTENT') })
          )
        )
      )
    )
  );

  await waitFor(() => {
    assert.ok(screen.getByText('PROTECTED_DASHBOARD_CONTENT'));
  });
});

test('workflow: PublicRoute redirects authenticated users to dashboard', async () => {
  globalThis.localStorage.setItem('cms_token', 'valid-token');
  globalThis.localStorage.setItem('cms_user', JSON.stringify({ id: 'u1', name: 'Alice' }));
  authService.getMe = async () => ({ user: { id: 'u1', name: 'Alice' } });

  render(
    React.createElement(MemoryRouter, { initialEntries: ['/login'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/dashboard', element: React.createElement('div', null, 'DASHBOARD_VIEW') }),
          React.createElement(Route, { element: React.createElement(PublicRoute) },
            React.createElement(Route, { path: '/login', element: React.createElement('div', null, 'PUBLIC_LOGIN') })
          )
        )
      )
    )
  );

  await waitFor(() => {
    assert.ok(screen.getByText('DASHBOARD_VIEW'));
    assert.equal(screen.queryByText('PUBLIC_LOGIN'), null);
  });
});

// ============================================================================
// 4. CONTACT CRUD WORKFLOWS: Create, Edit, Delete, and Modal Validation
// ============================================================================

test('workflow: Dashboard opens Add Contact modal and validates required contact fields', async () => {
  contactService.getContacts = async () => ({
    contacts: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
  });

  renderWithAuth(React.createElement(DashboardPage));

  const addBtn = await screen.findByRole('button', { name: /\+ Add Contact/i });
  fireEvent.click(addBtn);

  assert.ok(screen.getByRole('heading', { name: 'Add New Contact' }));

  // Submit empty modal
  const createBtn = screen.getByRole('button', { name: 'Create Contact' });
  fireEvent.click(createBtn);

  assert.ok(screen.getByText('Name is required'));
  assert.ok(screen.getByText('Phone number is required'));
});

test('workflow: Dashboard creates contact and shows feedback message', async () => {
  let createdContact = null;
  contactService.getContacts = async () => ({
    contacts: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
  });
  contactService.createContact = async (data) => {
    createdContact = data;
    return { _id: 'c101', ...data };
  };

  renderWithAuth(React.createElement(DashboardPage));

  const addBtn = await screen.findByRole('button', { name: /\+ Add Contact/i });
  fireEvent.click(addBtn);

  fireEvent.change(screen.getByLabelText(/Name \*/i), { target: { value: 'Bruce Wayne' } });
  fireEvent.change(screen.getByLabelText(/Phone \*/i), { target: { value: '555-1234' } });
  fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'bruce@wayne.com' } });
  fireEvent.change(screen.getByLabelText(/Company \/ Organization/i), { target: { value: 'Wayne Enterprises' } });

  fireEvent.click(screen.getByRole('button', { name: 'Create Contact' }));

  await waitFor(() => {
    assert.equal(createdContact?.name, 'Bruce Wayne');
    assert.equal(createdContact?.phone, '555-1234');
    assert.ok(screen.getByText('Contact added successfully!'));
  });
});

test('workflow: Dashboard edits an existing contact', async () => {
  const existingContact = {
    _id: 'c1',
    name: 'Clark Kent',
    phone: '555-0001',
    email: 'clark@dailyplanet.com',
    company: 'Daily Planet',
  };

  contactService.getContacts = async () => ({
    contacts: [existingContact],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
  });

  let updatePayload = null;
  contactService.updateContact = async (id, data) => {
    updatePayload = { id, data };
    return { ...existingContact, ...data };
  };

  renderWithAuth(React.createElement(DashboardPage));

  await screen.findByText('Clark Kent');
  const editBtn = screen.getByRole('button', { name: 'Edit' });
  fireEvent.click(editBtn);

  assert.ok(screen.getByRole('heading', { name: 'Edit Contact' }));
  const phoneInput = screen.getByLabelText(/Phone \*/i);
  fireEvent.change(phoneInput, { target: { value: '555-9999' } });

  fireEvent.click(screen.getByRole('button', { name: 'Update Contact' }));

  await waitFor(() => {
    assert.equal(updatePayload?.id, 'c1');
    assert.equal(updatePayload?.data?.phone, '555-9999');
    assert.ok(screen.getByText('Contact updated successfully!'));
  });
});

test('workflow: Dashboard deletes contact after confirmation', async () => {
  const contactToDelete = {
    _id: 'c2',
    name: 'Diana Prince',
    phone: '555-3333',
    email: 'diana@themyscira.gov',
    company: 'Themyscira',
  };

  contactService.getContacts = async () => ({
    contacts: [contactToDelete],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
  });

  let deletedId = null;
  contactService.deleteContact = async (id) => {
    deletedId = id;
    return { message: 'Deleted' };
  };

  renderWithAuth(React.createElement(DashboardPage));

  await screen.findByText('Diana Prince');
  const deleteBtn = screen.getByRole('button', { name: 'Delete' });
  fireEvent.click(deleteBtn);

  // Confirm delete dialog appears
  assert.ok(screen.getByText(/Are you sure you want to delete/i));
  const confirmDeleteBtn = screen.getByRole('button', { name: 'Confirm Delete' });
  fireEvent.click(confirmDeleteBtn);

  await waitFor(() => {
    assert.equal(deletedId, 'c2');
    assert.ok(screen.getByText('Contact deleted successfully!'));
  });
});

// ============================================================================
// 5. SEARCH & FILTER CONTROLS: Search Input, Debounce, and Company Dropdown
// ============================================================================

test('workflow: search input triggers debounced contact search', async () => {
  let searchParamReceived = null;
  contactService.getContacts = async (params) => {
    if (params?.search) {
      searchParamReceived = params.search;
    }
    return {
      contacts: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    };
  };

  renderWithAuth(React.createElement(DashboardPage));

  const searchInput = await screen.findByPlaceholderText(/Search by name, email, phone, or company/i);
  fireEvent.change(searchInput, { target: { value: 'Bruce' } });

  await waitFor(() => {
    assert.equal(searchParamReceived, 'Bruce');
  }, { timeout: 1500 });
});

test('workflow: company dropdown filters contacts', async () => {
  let companyParamReceived = null;
  contactService.getContacts = async (params) => {
    if (params?.company) {
      companyParamReceived = params.company;
    }
    return {
      contacts: [
        { _id: 'c1', name: 'Tony Stark', phone: '555-1000', company: 'Stark Industries' },
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
  };

  renderWithAuth(React.createElement(DashboardPage));

  await screen.findByText('Tony Stark');
  const select = screen.getByLabelText(/Filter by company/i);
  fireEvent.change(select, { target: { value: 'Stark Industries' } });

  await waitFor(() => {
    assert.equal(companyParamReceived, 'Stark Industries');
  });
});

// ============================================================================
// 6. LOADING STATES & VISIBLE API ERROR FEEDBACK
// ============================================================================

test('workflow: Dashboard displays loading spinner while fetching and empty state when list is empty', async () => {
  let finishLoading;
  contactService.getContacts = () => new Promise((resolve) => {
    finishLoading = () => resolve({
      contacts: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });
  });

  renderWithAuth(React.createElement(DashboardPage));

  // Spinner & loading text visible initially
  assert.ok(screen.getByText('Loading your contacts...'));

  // Complete fetch
  finishLoading();

  await waitFor(() => {
    assert.ok(screen.getByText('No contacts yet'));
  });
});

test('workflow: Dashboard displays visible error banner when contactService fails', async () => {
  contactService.getContacts = async () => {
    throw new Error('Failed to load contacts: Server unavailable');
  };

  renderWithAuth(React.createElement(DashboardPage));

  await waitFor(() => {
    assert.ok(screen.getByText(/Failed to load contacts: Server unavailable/));
  });
});

test('workflow: ContactModal displays disabled saving state when isSubmitting is true', () => {
  render(
    React.createElement(ContactModal, {
      isOpen: true,
      onClose: () => {},
      onSubmit: () => {},
      initialData: null,
      isSubmitting: true,
    })
  );

  const savingBtn = screen.getByRole('button', { name: 'Saving...' });
  assert.ok(savingBtn);
  assert.ok(savingBtn.disabled);
});
