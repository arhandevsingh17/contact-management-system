import { apiRequest } from './api';

// contacts CRUD - list, create, update, delete

export const contactService = {
  async getContacts(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    const endpoint = qs ? `/contacts?${qs}` : '/contacts';

    const data = await apiRequest(endpoint);
    // kabhi array aata hai kabhi {contacts, total}
    if (Array.isArray(data)) {
      return { contacts: data, total: data.length };
    }
    return {
      contacts: data.contacts || [],
      total: data.total || (data.contacts ? data.contacts.length : 0),
    };
  },

  async getContactById(id) {
    return apiRequest(`/contacts/${id}`);
  },

  async createContact(contactData) {
    return apiRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },

  async updateContact(id, contactData) {
    return apiRequest(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  },

  async deleteContact(id) {
    return apiRequest(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};
