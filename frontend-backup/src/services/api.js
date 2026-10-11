// simple api helper - talks to backend, falls back to localStorage demo data if offline

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// some seed contacts so the UI isn't empty when backend is down
const INITIAL_DEMO_CONTACTS = [
  {
    _id: 'contact-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@techcorp.in',
    phone: '+91 98201 44521',
    company: 'TechCorp Solutions',
    category: 'Work',
    notes: 'Lead architect for cloud migration project.',
    userId: 'user-1',
    createdBy: 'Demo User',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    _id: 'contact-2',
    name: 'Priya Patel',
    email: 'priya.patel@designstudio.com',
    phone: '+91 98450 12345',
    company: 'Studio Pixel & Co',
    category: 'Client',
    notes: 'Key stakeholder for Q4 design sprint.',
    userId: 'user-1',
    createdBy: 'Demo User',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    _id: 'contact-3',
    name: 'Rohan Gupta',
    email: 'rohan.gupta@familymail.org',
    phone: '+91 97112 98765',
    company: 'Self-Employed',
    category: 'Family',
    notes: 'Birthday on November 15th.',
    userId: 'user-1',
    createdBy: 'Demo User',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    _id: 'contact-4',
    name: 'Sneha Kulkarni',
    email: 'sneha.k@fintechhub.io',
    phone: '+91 99304 55678',
    company: 'Fintech Hub India',
    category: 'Work',
    notes: 'Contact for payroll and invoicing queries.',
    userId: 'user-2',
    createdBy: 'Demo Admin',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    _id: 'contact-5',
    name: 'Kabir Mehta',
    email: 'kabir.mehta@personal.me',
    phone: '+91 98711 33221',
    company: 'Freelance Writer',
    category: 'Personal',
    notes: 'College roommate, runs a weekend tech newsletter.',
    userId: 'user-1',
    createdBy: 'Demo User',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  }
];

// get contacts from localStorage (demo mode)
const getDemoContacts = () => {
  const stored = localStorage.getItem('demo_contacts');
  if (!stored) {
    localStorage.setItem('demo_contacts', JSON.stringify(INITIAL_DEMO_CONTACTS));
    return INITIAL_DEMO_CONTACTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_DEMO_CONTACTS;
  }
};

const saveDemoContacts = (contacts) => {
  localStorage.setItem('demo_contacts', JSON.stringify(contacts));
};

let isDemoMode = false;

export const getApiStatus = () => ({
  isDemoMode,
  apiUrl: API_BASE_URL
});

export const setDemoMode = (enabled) => {
  isDemoMode = enabled;
};

/**
 * Universal fetch wrapper with timeout and JWT header
 */
export async function apiRequest(endpoint, options = {}) {
  // If explicitly in demo mode, skip network
  if (isDemoMode) {
    return handleDemoRequest(endpoint, options);
  }

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    // If backend is not running (e.g. Failed to fetch or AbortError), gracefully activate demo fallback
    if (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.warn(`[Backend Offline] Falling back to Demo LocalStorage Mode for endpoint: ${endpoint}`);
      isDemoMode = true;
      return handleDemoRequest(endpoint, options);
    }
    throw error;
  }
}

/**
 * Fallback offline handler when backend is offline
 */
function handleDemoRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const user = JSON.parse(localStorage.getItem('user') || '{"id":"user-1","name":"Demo User","role":"User"}');
  let contacts = getDemoContacts();

  // Auth endpoints
  if (endpoint === '/auth/login') {
    const isMockAdmin = body.email && body.email.toLowerCase().includes('admin');
    const mockUser = {
      id: isMockAdmin ? 'admin-1' : 'user-1',
      name: isMockAdmin ? 'Demo Admin' : (body.email ? body.email.split('@')[0] : 'Demo User'),
      email: body.email || 'user@example.com',
      role: isMockAdmin ? 'Admin' : 'User'
    };
    return {
      token: 'demo_jwt_token_header_payload_signature',
      user: mockUser
    };
  }

  if (endpoint === '/auth/register') {
    const mockUser = {
      id: `user-${Date.now()}`,
      name: body.name || 'New User',
      email: body.email,
      role: body.role === 'Admin' ? 'Admin' : 'User'
    };
    return {
      token: 'demo_jwt_token_header_payload_signature',
      user: mockUser
    };
  }

  // Contacts endpoints
  if (endpoint.startsWith('/contacts')) {
    if (method === 'GET') {
      // single contact by id
      const idMatch = endpoint.match(/\/contacts\/([^?]+)/);
      if (idMatch && idMatch[1] && !endpoint.includes('?')) {
        const found = contacts.find(c => c._id === idMatch[1]);
        if (!found) throw new Error('Contact not found');
        return found;
      }

      // return list
      // admin sees everything, normal users only their own
      let filtered = contacts;
      if (user.role !== 'Admin') {
        filtered = filtered.filter(c => c.userId === user.id || !c.userId);
      }
      return { contacts: filtered, total: filtered.length };
    }

    if (method === 'POST') {
      const newContact = {
        _id: `contact-${Date.now()}`,
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company || '',
        category: body.category || 'Other',
        notes: body.notes || '',
        userId: user.id,
        createdBy: user.name,
        createdAt: new Date().toISOString()
      };
      contacts.unshift(newContact);
      saveDemoContacts(contacts);
      return newContact;
    }

    if (method === 'PUT') {
      const id = endpoint.split('/')[2];
      const index = contacts.findIndex(c => c._id === id);
      if (index === -1) throw new Error('Contact not found');

      // make sure user owns this contact (or is admin)
      if (user.role !== 'Admin' && contacts[index].userId && contacts[index].userId !== user.id) {
        throw new Error('Unauthorized to edit this contact');
      }

      contacts[index] = { ...contacts[index], ...body, updatedAt: new Date().toISOString() };
      saveDemoContacts(contacts);
      return contacts[index];
    }

    if (method === 'DELETE') {
      const id = endpoint.split('/')[2];
      const index = contacts.findIndex(c => c._id === id);
      if (index === -1) throw new Error('Contact not found');

      // make sure user owns this contact (or is admin)
      if (user.role !== 'Admin' && contacts[index].userId && contacts[index].userId !== user.id) {
        throw new Error('Unauthorized to delete this contact');
      }

      contacts = contacts.filter(c => c._id !== id);
      saveDemoContacts(contacts);
      return { message: 'Contact deleted successfully' };
    }
  }

  return { message: 'Demo operation successful' };
}
