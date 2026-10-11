import { apiRequest } from './api';
export const contactService = {
  async getContacts(params = {}) {
    const query = new URLSearchParams();

    if (params.search?.trim()) {
      query.set('search', params.search.trim());
    }

    if (params.company?.trim() && params.company !== 'All') {
      query.set('company', params.company.trim());
    }

  
    const allowedSortFields = ['name', 'company', 'createdAt'];
    const sortBy =
      params.sortBy ||
      (params.sort === 'company'
        ? 'company'
        : params.sort === 'newest'
        ? 'createdAt'
        : params.sort?.startsWith('name')
        ? 'name'
        : undefined);

    const order =
      params.order ||
      (params.sort === 'name-desc' || params.sort === 'newest'
        ? 'desc'
        : params.sort === 'name-asc'
        ? 'asc'
        : undefined);

    if (sortBy && allowedSortFields.includes(sortBy)) {
      query.set('sortBy', sortBy);
    }

    if (order && ['asc', 'desc'].includes(order)) {
      query.set('order', order);
    }

    if (params.page != null && params.page !== '') {
      query.set('page', String(params.page));
    }

    if (params.limit != null && params.limit !== '') {
      query.set('limit', String(params.limit));
    }

    const qs = query.toString();
    const endpoint = qs ? `/contacts?${qs}` : '/contacts';

    const data = await apiRequest(endpoint);

    if (Array.isArray(data)) {
      return {
        contacts: data,
        total: data.length,
      };
    }

    const contacts = Array.isArray(data?.contacts)
      ? data.contacts
      : [];

    const total =
      data?.pagination?.total != null
        ? Number(data.pagination.total)
        : Number.isFinite(Number(data?.total))
        ? Number(data.total)
        : contacts.length;

    return {
      contacts,
      total,
      pagination: data?.pagination,
    };
  },

  async getContactById(id) {
    return apiRequest(`/contacts/${encodeURIComponent(id)}`);
  },

  async createContact(contactData) {
    const payload = {
      name: contactData.name?.trim(),
      phone: contactData.phone?.trim(),
    };
    if (contactData.email != null) {
      payload.email = contactData.email.trim();
    }
    if (contactData.company != null) {
      payload.company = contactData.company.trim();
    }

    const data = await apiRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data?.contact || data;
  },

  async updateContact(id, contactData) {
    const payload = {};
    if (contactData.name !== undefined) {
      payload.name = contactData.name.trim();
    }
    if (contactData.email !== undefined) {
      payload.email = contactData.email ? contactData.email.trim() : '';
    }
    if (contactData.phone !== undefined) {
      payload.phone = contactData.phone.trim();
    }
    if (contactData.company !== undefined) {
      payload.company = contactData.company ? contactData.company.trim() : '';
    }

    const data = await apiRequest(`/contacts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data?.contact || data;
  },

  async deleteContact(id) {
    return apiRequest(`/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};