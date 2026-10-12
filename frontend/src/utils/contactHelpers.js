export const extractContacts = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.contacts)) return data.contacts;
  return [];
};

export const filterContacts = (contacts, searchQuery = '', companyFilter = '') => {
  if (!Array.isArray(contacts)) return [];
  const query = searchQuery.trim().toLowerCase();
  const trimmedCompany = companyFilter.trim();

  return contacts.filter((contact) => {
    const matchesSearch =
      !query ||
      (contact.name && contact.name.toLowerCase().includes(query)) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      (contact.phone && contact.phone.toLowerCase().includes(query)) ||
      (contact.company && contact.company.toLowerCase().includes(query));

    const matchesCompany =
      !trimmedCompany ||
      (contact.company && contact.company.trim() === trimmedCompany);

    return matchesSearch && matchesCompany;
  });
};

export const getUniqueCompanies = (contacts) => {
  if (!Array.isArray(contacts)) return [];
  const set = new Set();
  contacts.forEach((c) => {
    if (c.company && c.company.trim()) {
      set.add(c.company.trim());
    }
  });
  return Array.from(set).sort();
};
