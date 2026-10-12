const { isIP } = require("node:net");

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function getRawOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseOrigin(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Invalid FRONTEND_ORIGIN entry "${value}". Use an origin such as http://localhost:5173 or https://your-frontend.example.com.`
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `Invalid FRONTEND_ORIGIN entry "${value}". Configure an origin only (scheme and host), without a path, query, or credentials.`
    );
  }

  return parsed;
}

function isLoopbackHost(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    LOOPBACK_HOSTS.has(normalized) ||
    normalized.endsWith(".localhost") ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

function parseAllowedOrigins(rawValue) {
  return [...new Set(getRawOrigins(rawValue).map((value) => parseOrigin(value).origin))];
}

function validateCorsConfig(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const rawOrigins = getRawOrigins(env.FRONTEND_ORIGIN);

  if (isProduction && rawOrigins.length === 0) {
    throw new Error(
      "FRONTEND_ORIGIN is required in production. Set it to the deployed frontend origin (HTTPS)."
    );
  }

  const origins = parseAllowedOrigins(rawOrigins.join(","));

  if (isProduction) {
    for (const origin of origins) {
      const parsed = new URL(origin);
      const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
      if (
        parsed.protocol !== "https:" ||
        isLoopbackHost(parsed.hostname) ||
        isIP(hostname)
      ) {
        throw new Error(
          "Every production FRONTEND_ORIGIN must be a deployed HTTPS hostname; localhost, loopback, and IP-literal origins are not allowed."
        );
      }
    }
  }

  return origins;
}

function isLocalDevelopmentOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && (
      LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase()) ||
      parsed.hostname.toLowerCase().endsWith(".localhost") ||
      /^127(?:\.\d{1,3}){3}$/.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function createCorsOptions(env = process.env) {
  // Invalid configuration is rejected by validateCorsConfig() during server
  // startup. Until then, only valid configured origins can be allowed here.
  let allowedOrigins = [];
  try {
    allowedOrigins = parseAllowedOrigins(env.FRONTEND_ORIGIN);
  } catch {
    allowedOrigins = [];
  }

  const isProduction = env.NODE_ENV === "production";

  return {
    origin(origin, callback) {
      // Non-browser/server-to-server requests do not send Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (!isProduction && isLocalDevelopmentOrigin(origin)) {
        return callback(null, true);
      }

      // Deny browser CORS access without turning it into a server error.
      return callback(null, false);
    },
    optionsSuccessStatus: 204,
  };
}

module.exports = {
  createCorsOptions,
  validateCorsConfig,
};
