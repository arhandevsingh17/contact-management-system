
const Contact = require("../models/Contact");

// Create a contact
const createContact = async (req, res) => {
  try {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        message: "Request body must be a valid JSON object"
      });
    }

    const { name, email, phone, company } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof phone !== "string" ||
      !phone.trim()
    ) {
      return res.status(400).json({
        message: "Name and phone are required"
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      typeof email !== "string"
    ) {
      return res.status(400).json({
        message: "Email must be a string"
      });
    }

    if (
      company !== undefined &&
      company !== null &&
      typeof company !== "string"
    ) {
      return res.status(400).json({
        message: "Company must be a string"
      });
    }

    const contact = new Contact({
      name: name.trim(),
      email: email === undefined ? undefined : email,
      phone: phone.trim(),
      company,
      owner: req.user.id
    });

    await contact.save();

    return res.status(201).json({
      message: "Contact created successfully",
      contact
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Please enter valid contact details"
      });
    }

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

// Get contacts with search, filtering, sorting and pagination
const getContacts = async (req, res) => {
  try {
    const {
      search,
      company,
      sortBy = "createdAt",
      order = "desc",
      page = "1",
      limit = "10"
    } = req.query;

    const allowedSortFields = ["name", "company", "createdAt"];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        message: "Invalid sortBy field. Use name, company, or createdAt."
      });
    }

    if (!["asc", "desc"].includes(order)) {
      return res.status(400).json({
        message: "Invalid order. Use asc or desc."
      });
    }

    if (!/^\d+$/.test(page) || Number(page) < 1) {
      return res.status(400).json({
        message: "Page must be a positive integer."
      });
    }

    if (
      !/^\d+$/.test(limit) ||
      Number(limit) < 1 ||
      Number(limit) > 100
    ) {
      return res.status(400).json({
        message: "Limit must be between 1 and 100."
      });
    }

    if (
      search !== undefined &&
      (typeof search !== "string" || search.length > 100)
    ) {
      return res.status(400).json({
        message: "Search must be a string of at most 100 characters."
      });
    }

    if (
      company !== undefined &&
      (typeof company !== "string" ||
        !company.trim() ||
        company.length > 100)
    ) {
      return res.status(400).json({
        message: "Company must be a non-empty string of at most 100 characters."
      });
    }

    const currentPage = Number(page);
    const pageSize = Number(limit);

    // Never remove this ownership condition.
    const filter = {
      owner: req.user.id
    };

    // Search across name, email, phone and company.
    if (search !== undefined && search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
        { company: { $regex: escapedSearch, $options: "i" } }
      ];
    }

    // Apply company filter together with the search filter.
    if (company !== undefined) {
      const escapedCompany = company.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.company = {
        $regex: "^" + escapedCompany + "$",
        $options: "i"
      };
    }

    const sortDirection = order === "asc" ? 1 : -1;
    const skip = (currentPage - 1) * pageSize;

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort({ [sortBy]: sortDirection, _id: 1 })
        .skip(skip)
        .limit(pageSize),
      Contact.countDocuments(filter)
    ]);

    return res.status(200).json({
      contacts,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

// Get one contact belonging to the logged-in user
const getContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        message: "Invalid contact ID"
      });
    }

    const contact = await Contact.findOne({
      _id: id,
      owner: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found"
      });
    }

    return res.status(200).json(contact);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

// Update a contact belonging to the logged-in user
const updateContact = async (req, res) => {
  try {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        message: "Request body must be a valid JSON object"
      });
    }

    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        message: "Invalid contact ID"
      });
    }

    const { name, email, phone, company } = req.body;

    const allowedFields = ["name", "email", "phone", "company"];
    const suppliedFields = Object.keys(req.body);

    if (
      suppliedFields.length === 0 ||
      !suppliedFields.some((field) => allowedFields.includes(field))
    ) {
      return res.status(400).json({
        message: "Please provide a valid field to update"
      });
    }

    if (suppliedFields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({
        message: "Request contains unsupported fields"
      });
    }

    if (
      (name !== undefined &&
        (typeof name !== "string" || !name.trim())) ||
      (phone !== undefined &&
        (typeof phone !== "string" || !phone.trim()))
    ) {
      return res.status(400).json({
        message: "Name and phone must be valid text"
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      typeof email !== "string"
    ) {
      return res.status(400).json({
        message: "Email must be a string"
      });
    }

    if (
      company !== undefined &&
      company !== null &&
      typeof company !== "string"
    ) {
      return res.status(400).json({
        message: "Company must be a string"
      });
    }

    const contact = await Contact.findOne({
      _id: id,
      owner: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found"
      });
    }

    if (name !== undefined) contact.name = name.trim();
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone.trim();
    if (company !== undefined) contact.company = company;

    await contact.save();

    return res.status(200).json({
      message: "Contact updated successfully",
      contact
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Please enter valid contact details"
      });
    }

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

// Delete a contact belonging to the logged-in user
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        message: "Invalid contact ID"
      });
    }

    const contact = await Contact.findOneAndDelete({
      _id: id,
      owner: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found"
      });
    }

    return res.status(200).json({
      message: "Contact deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact
};
