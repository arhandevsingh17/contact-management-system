const VALID_ROLES = ["User", "Admin"];

/**
 * Role-Based Authorization Middleware Factory
 * Accepts permitted roles (e.g., requireRole("Admin") or requireRole("Admin", "User"))
 * Fails safely if no roles or invalid roles are provided.
 */
const requireRole = (...roles) => {
  const candidateRoles = roles.flat();

  // Validate configuration: all candidate roles must be valid role strings
  const isValidConfig =
    candidateRoles.length > 0 &&
    candidateRoles.every(
      (role) => typeof role === "string" && VALID_ROLES.includes(role)
    );

  const allowedRoles = isValidConfig ? candidateRoles : [];

  return (req, res, next) => {
    // Fail safely if role middleware was improperly configured
    if (!isValidConfig) {
      return res
        .status(403)
        .json({ message: "Access forbidden: invalid role configuration" });
    }

    // User must be authenticated
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // User's role must be in the permitted roles
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access forbidden: insufficient permissions" });
    }

    return next();
  };
};

module.exports = requireRole;
