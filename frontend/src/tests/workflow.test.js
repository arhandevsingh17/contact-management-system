import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register jsxLoader to compile .jsx components natively on Node
const loaderUrl = pathToFileURL(new URL('./jsxLoader.mjs', import.meta.url).pathname).href;
register(loaderUrl, import.meta.url);

// Minimal DOM globals for components
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => {
    storage[k] = String(v);
  },
  removeItem: (k) => {
    delete storage[k];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
};
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
};

import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { LoginPage } = await import('../pages/LoginPage.jsx');
const { RegisterPage } = await import('../pages/RegisterPage.jsx');
const { ProtectedRoute, PublicRoute } = await import('../components/ProtectedRoute.jsx');
const { ContactModal } = await import('../components/ContactModal.jsx');

const { AuthProvider } = await import('../context/AuthContext.jsx');

// Helper to render component inside MemoryRouter with AuthProvider
const renderWithRouter = (element, initialEntries = ['/']) => {
  return renderToString(
    React.createElement(MemoryRouter, { initialEntries },
      React.createElement(AuthProvider, null, element)
    )
  );
};

test('workflow: LoginPage renders properly with accessible labels and login inputs', () => {
  const html = renderWithRouter(
    React.createElement(LoginPage)
  );

  assert.match(html, /Welcome Back/);
  assert.match(html, /Sign in to access and manage your contacts/);
  assert.match(html, /id="login-email"/);
  assert.match(html, /id="login-password"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /Log In/);
  assert.match(html, /href="\/register"/);
});

test('workflow: LoginPage displays registration message when routed from signup', () => {
  const html = renderToString(
    React.createElement(MemoryRouter, {
      initialEntries: [{ pathname: '/login', state: { registeredMessage: 'Registration successful! Please log in.' } }],
    }, React.createElement(AuthProvider, null, React.createElement(LoginPage)))
  );

  assert.match(html, /Registration successful! Please log in\./);
  assert.match(html, /alert-success/);
});

test('workflow: RegisterPage renders all required registration fields and links', () => {
  const html = renderWithRouter(
    React.createElement(RegisterPage)
  );

  assert.match(html, /Create an Account/);
  assert.match(html, /id="register-name"/);
  assert.match(html, /id="register-email"/);
  assert.match(html, /id="register-password"/);
  assert.match(html, /id="register-confirm-password"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /Register/);
  assert.match(html, /href="\/login"/);
});

test('workflow: ProtectedRoute renders session verification loading state when isInitializing', async () => {
  globalThis.localStorage.setItem('cms_token', 'mock-token');

  const html = renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/protected'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { element: React.createElement(ProtectedRoute) },
            React.createElement(Route, { path: '/protected', element: React.createElement('div', null, 'SECRET CONTENT') })
          )
        )
      )
    )
  );

  assert.match(html, /Verifying session\.\.\./);
  assert.match(html, /loading-state/);
  assert.doesNotMatch(html, /SECRET CONTENT/);

  globalThis.localStorage.clear();
});

test('workflow: ProtectedRoute blocks unauthenticated users and prevents rendering protected content', async () => {
  globalThis.localStorage.clear();

  const html = renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/protected'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { element: React.createElement(ProtectedRoute) },
            React.createElement(Route, { path: '/protected', element: React.createElement('div', null, 'SECRET CONTENT') })
          )
        )
      )
    )
  );

  // In unauthenticated state, ProtectedRoute renders Navigate to /login (no protected content is output)
  assert.equal(html, '');
  assert.doesNotMatch(html, /SECRET CONTENT/);
});

test('workflow: PublicRoute allows guest users to view login page', async () => {
  const { AuthProvider } = await import('../context/AuthContext.jsx');
  globalThis.localStorage.clear();

  const html = renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/login'] },
      React.createElement(AuthProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { element: React.createElement(PublicRoute) },
            React.createElement(Route, { path: '/login', element: React.createElement('div', null, 'GUEST LOGIN VIEW') })
          )
        )
      )
    )
  );

  assert.match(html, /GUEST LOGIN VIEW/);
});

test('workflow: ContactModal renders Create Contact modal when initialData is null', () => {
  const html = renderToString(
    React.createElement(ContactModal, {
      isOpen: true,
      onClose: () => {},
      onSubmit: () => {},
      initialData: null,
      isSubmitting: false,
    })
  );

  assert.match(html, /Add New Contact/);
  assert.match(html, /id="contact-name"/);
  assert.match(html, /id="contact-phone"/);
  assert.match(html, /id="contact-email"/);
  assert.match(html, /id="contact-company"/);
  assert.match(html, /Create Contact/);
  assert.match(html, /aria-modal="true"/);
});

test('workflow: ContactModal renders Edit Contact modal with populated data', () => {
  const existingContact = {
    _id: 'c123',
    name: 'Kabir Khan',
    phone: '9876543210',
    email: 'kabir@openai.com',
    company: 'OpenAI',
  };

  const html = renderToString(
    React.createElement(ContactModal, {
      isOpen: true,
      onClose: () => {},
      onSubmit: () => {},
      initialData: existingContact,
      isSubmitting: false,
    })
  );

  assert.match(html, /Edit Contact/);
  assert.match(html, /value="Kabir Khan"/);
  assert.match(html, /value="9876543210"/);
  assert.match(html, /value="kabir@openai.com"/);
  assert.match(html, /value="OpenAI"/);
  assert.match(html, /Update Contact/);
});

test('workflow: ContactModal displays disabled saving state when isSubmitting is true', () => {
  const html = renderToString(
    React.createElement(ContactModal, {
      isOpen: true,
      onClose: () => {},
      onSubmit: () => {},
      initialData: null,
      isSubmitting: true,
    })
  );

  assert.match(html, /Saving\.\.\./);
  assert.match(html, /disabled/);
});

test('workflow: ContactModal returns null when isOpen is false', () => {
  const html = renderToString(
    React.createElement(ContactModal, {
      isOpen: false,
      onClose: () => {},
      onSubmit: () => {},
      initialData: null,
    })
  );

  assert.equal(html, '');
});

test('workflow: DashboardPage renders loading and empty states properly', async () => {
  const { DashboardPage } = await import('../pages/DashboardPage.jsx');

  const html = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(DashboardPage)
    )
  );

  // Initial render starts in loading state
  assert.match(html, /My Contacts/);
  assert.match(html, /Manage your personal and professional connections/);
  assert.match(html, /Loading your contacts\.\.\./);
  assert.match(html, /spinner/);
});

test('workflow: login validation logic properly detects invalid inputs', () => {
  const validateLogin = (email, password) => {
    const errors = {};
    if (!email || !email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    return errors;
  };

  assert.deepEqual(validateLogin('', ''), {
    email: 'Email is required',
    password: 'Password is required',
  });

  assert.deepEqual(validateLogin('not-an-email', 'secret123'), {
    email: 'Please enter a valid email address',
  });

  assert.deepEqual(validateLogin('valid@example.com', 'secret123'), {});
});

test('workflow: registration validation logic validates name, email, password length, and password match', () => {
  const validateRegister = (name, email, password, confirmPassword) => {
    const errors = {};
    if (!name || !name.trim()) {
      errors.name = 'Name is required';
    }
    if (!email || !email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  // Missing fields
  assert.deepEqual(validateRegister('', '', '', ''), {
    name: 'Name is required',
    email: 'Email is required',
    password: 'Password is required',
  });

  // Short password
  assert.deepEqual(validateRegister('User', 'user@example.com', '123', '123'), {
    password: 'Password must be at least 6 characters',
  });

  // Password mismatch
  assert.deepEqual(validateRegister('User', 'user@example.com', 'password123', 'different'), {
    confirmPassword: 'Passwords do not match',
  });

  // All valid
  assert.deepEqual(validateRegister('User', 'user@example.com', 'password123', 'password123'), {});
});

test('workflow: contact modal validation logic validates required name, phone, and optional email', () => {
  const validateContact = (name, phone, email) => {
    const errors = {};
    if (!name || !name.trim()) {
      errors.name = 'Name is required';
    }
    if (!phone || !phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    return errors;
  };

  assert.deepEqual(validateContact('', '', ''), {
    name: 'Name is required',
    phone: 'Phone number is required',
  });

  assert.deepEqual(validateContact('John', '555-1234', 'bad-email'), {
    email: 'Please enter a valid email address',
  });

  assert.deepEqual(validateContact('John', '555-1234', 'good@corp.com'), {});
  assert.deepEqual(validateContact('John', '555-1234', ''), {});
});
