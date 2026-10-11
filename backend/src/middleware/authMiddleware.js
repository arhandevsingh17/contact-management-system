const jwt = require("jsonwebtoken");

const ALLOWED_ROLES = ["User", "Admin"];

/**
 * Validate that an ID conforms to the 24-character hexadecimal MongoDB ObjectId format.
 */
const isValidObjectId = (id) => {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Authentication Middleware
 * Strictly parses Authorization: Bearer <token>
 * Verifies JWT signature and payload integrity
 * Attaches verified { id, role } to req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Header must exist and be a string
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ message: "Authorization token required" });
  }

  // Strictly enforce standard "Bearer <token>" with exactly one non-whitespace token
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return res.status(401).json({ message: "Authorization header malformed" });
  }

  const token = parts[1];

  // Fail safely if JWT_SECRET is missing or blank in server configuration
  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    const configError = new Error("JWT secret is not configured on the server");
    configError.status = 500;
    return next(configError);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate payload ID format and role
    if (
      !decoded ||
      !isValidObjectId(decoded.id) ||
      !ALLOWED_ROLES.includes(decoded.role)
    ) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Attach verified identity; never trust client-supplied roles
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    // Handle expected JWT verification errors with HTTP 401
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError" ||
      error.name === "SyntaxError"
    ) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Forward unexpected errors to the centralized error handler
    return next(error);
  }
};

module.exports = authMiddleware;
