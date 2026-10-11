const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Basic email format validator
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ message: "Password is required" });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Check if user with given email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user strictly with "User" role (ignore any client-provided role)
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "User",
    });

    // Return sanitized user object (excluding password and password hash)
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (E11000) as a 409 Conflict
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    // Handle Mongoose schema validation errors as 400 Bad Request
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    // Forward unexpected errors to the centralized error handler
    return next(error);
  }
};

/**
 * Login user and issue JWT
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate required fields
    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for missing server JWT_SECRET configuration
    if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
      const configError = new Error("JWT secret is not configured on the server");
      configError.status = 500;
      return next(configError);
    }

    // Find user by normalized email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Use identical generic message to avoid leaking user existence
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare candidate password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Sign JWT token containing user id and role
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return token and sanitized user object
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
};
