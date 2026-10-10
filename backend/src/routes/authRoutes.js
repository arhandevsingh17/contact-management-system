const express = require("express");
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

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

module.exports = router;
