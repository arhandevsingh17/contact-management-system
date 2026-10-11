const express = require("express");
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Public authentication routes
router.post("/register", register);
router.post("/login", login);

// Protected route: retrieves current authenticated user identity
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

// Protected route: administrator-only demonstration endpoint
router.get("/admin-test", authMiddleware, requireRole("Admin"), (req, res) => {
  res.json({
    message: "Admin access granted",
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

module.exports = router;
