
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact
} = require("../controllers/contactController");

const router = express.Router();


router.use(authMiddleware);

router.post("/", createContact);


router.get("/", getContacts);


router.get("/:id", getContact);


router.put("/:id", updateContact);

router.delete("/:id", deleteContact);

module.exports = router;
