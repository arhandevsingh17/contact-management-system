
const Contact = require("../models/Contact");

// Create a contact
const createContact = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
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

    const contact = new Contact({
      name,
      email,
      phone,
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

// Get all contacts belonging to the logged-in user
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({
      owner: req.user.id
    });

    return res.status(200).json(contacts);
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
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
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

    if (
      name === undefined &&
      email === undefined &&
      phone === undefined &&
      company === undefined
    ) {
      return res.status(400).json({
        message: "Please provide a field to update"
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

    const contact = await Contact.findOne({
      _id: id,
      owner: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found"
      });
    }

    if (name !== undefined) contact.name = name;
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
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
