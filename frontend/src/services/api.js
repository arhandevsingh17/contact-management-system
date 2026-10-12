const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env && globalThis.process.env.VITE_API_URL) ||
  'http://localhost:5001/api'
).replace(/\/+$/, '');

const TOKEN_KEY = 'cms_token';
const USER_KEY = 'cms_user';

export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = () => {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

export const setAuthSession = (token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new Error(error.message || 'Network request failed. Is the backend server running?', {
      cause: error,
    });
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      // ignore json parse errors
    }
  } else {
    try {
      const text = await response.text();
      if (text) {
        data = { message: text };
      }
    } catch {
      // ignore text parse errors
    }
  }

  if (response.status === 401) {
    clearAuthSession();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cms:unauthorized'));
    }
    const message = (data && data.message) || 'Session expired. Please log in again.';
    const err = new Error(message);
    err.status = 401;
    err.data = data;
    throw err;
  }

  if (!response.ok) {
    const message = (data && data.message) || `Request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};

export const authService = {
  register: (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: userData,
    });
  },
  login: async (credentials) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    if (data && data.token) {
      setAuthSession(data.token, data.user);
    }
    return data;
  },
  getMe: () => {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },
  logout: () => {
    clearAuthSession();
  },
};

export const contactService = {
  getContacts: (params = {}) => {
    let endpoint = '/contacts';
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();

      if (params.search && typeof params.search === 'string' && params.search.trim()) {
        searchParams.set('search', params.search.trim());
      }
      if (params.company && typeof params.company === 'string' && params.company.trim()) {
        searchParams.set('company', params.company.trim());
      }
      if (params.sortBy && typeof params.sortBy === 'string' && params.sortBy.trim()) {
        searchParams.set('sortBy', params.sortBy.trim());
      }
      if (params.order && typeof params.order === 'string' && params.order.trim()) {
        searchParams.set('order', params.order.trim());
      }
      if (params.page !== undefined && params.page !== null && params.page !== '') {
        searchParams.set('page', String(params.page));
      }
      if (params.limit !== undefined && params.limit !== null && params.limit !== '') {
        searchParams.set('limit', String(params.limit));
      }

      const queryString = searchParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
  getContact: (id) => {
    return apiRequest(`/contacts/${id}`, {
      method: 'GET',
    });
  },
  createContact: (contactData) => {
    return apiRequest('/contacts', {
      method: 'POST',
      body: contactData,
    });
  },
  updateContact: (id, contactData) => {
    return apiRequest(`/contacts/${id}`, {
      method: 'PUT',
      body: contactData,
    });
  },
  deleteContact: (id) => {
    return apiRequest(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};
