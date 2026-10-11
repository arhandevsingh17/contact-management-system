# Contact Management System

A secure full-stack contact management application with JWT authentication, role-based access control (RBAC), and user-isolated contact management.

---

## Security Architecture & Implementation

### 1. Authentication & JWT Validation
- **Token Format**: Standard `Authorization: Bearer <token>` header format.
- **Fail-Safe Server Configuration**: Validates `process.env.JWT_SECRET` presence and non-whitespace content in server bootstrap, authentication middleware, and authentication controllers. If missing or blank, the system fails closed with HTTP 500 without processing tokens.
- **Signature & Tamper Verification**: Verifies HMAC SHA-256 signatures; rejects tampered or expired tokens with HTTP 401.
- **Payload Schema Validation**: Requires valid 24-character hexadecimal MongoDB ObjectIds for user `id` and permits only whitelisted roles (`User`, `Admin`).
- **Resilient Parsing**: Traps `SyntaxError` from corrupted or malformed base64 JSON token payloads as HTTP 401 instead of crashing or leaking server 500 errors.

### 2. User Registration & Login Defenses
- **Input Sanitization**: Requires non-empty, trimmed strings for name, email, and password. Validates email against standard syntax regex.
- **Privilege Escalation Prevention**: Ignores any client-supplied `role` during registration and strictly assigns `role: "User"`.
- **Password Protection**: Hashes passwords using `bcryptjs` with salt rounds (factor 10); plaintext passwords are never stored.
- **Response Sanitization**: Strips passwords and password hashes from user responses on registration and login.
- **User Enumeration Defense**: Employs identical generic error messages (`Invalid email or password`, HTTP 401) for both non-existent emails and incorrect passwords to prevent account enumeration.

### 3. Role-Based Access Control (RBAC)
- **Middleware Factory**: `requireRole(...roles)` validates configuration at runtime and fails closed (HTTP 403) on unconfigured or invalid role arguments.
- **Strict Role Enforcement**: Requires prior authentication (`req.user.role`); rejects unauthorized roles with HTTP 403 `Access forbidden: insufficient permissions`.
- **Endpoints**:
  - `GET /api/auth/me`: Accessible to any authenticated user to inspect their verified identity.
  - `GET /api/auth/admin-test`: Restricted strictly to users with the `Admin` role.

### 4. Contact Multi-Tenancy & Cross-User Isolation
- **Global Route Protection**: All contact endpoints (`/api/contacts/*`) require valid JWT authentication via `authMiddleware`.
- **Ownership Enforcement on Creation**: In `POST /api/contacts`, contact ownership (`owner`) is strictly bound to `req.user.id`. Any client-supplied `owner` in the request body is ignored.
- **Query Scoping on Retrieval**: In `GET /api/contacts`, database queries are scoped to `{ owner: req.user.id }`, guaranteeing that users cannot view contacts owned by other users.
- **Isolated Updates & Deletions**: In `GET /api/contacts/:id`, `PUT /api/contacts/:id`, and `DELETE /api/contacts/:id`, operations query `{ _id: id, owner: req.user.id }`. Attempting to access, modify, or delete another user's contact returns HTTP 404, preventing information leakage and cross-tenant tampering.
- **Immutable Ownership**: The `owner` field cannot be modified via `PUT /api/contacts/:id`.
- **ID Validation**: Validates that contact IDs conform to 24-character hexadecimal ObjectId format, returning HTTP 400 for malformed IDs.

---

## Test Suite & Verification

The backend utilizes Node.js's built-in test runner (`node:test` and `node:assert`). No third-party test dependencies or external services are required.

### Running Backend Tests

Navigate to the `backend` directory and run:

```bash
cd backend
npm test
```

Or run via Node directly:

```bash
node --test
```

### Test Coverage Overview

- **`src/__tests__/jwtValidation.test.js`**:
  - Missing, non-string, or malformed `Authorization` headers (HTTP 401).
  - Missing or blank server `JWT_SECRET` fail-safe (HTTP 500).
  - Invalid signature, tampered tokens, corrupted payloads (`SyntaxError`), and expired tokens (HTTP 401).
  - Payload schema validation (invalid ObjectId format, unknown roles) (HTTP 401).
  - Verified user identity attachment (`req.user = { id, role }`).
- **`src/__tests__/authSecurity.test.js`**:
  - Registration field validation (missing/whitespace name, email, password, invalid email format) (HTTP 400).
  - Duplicate email prevention and duplicate key error handling (HTTP 409).
  - Privilege escalation defense (blocking client-specified `Admin` role).
  - Password hashing with bcrypt and response sanitization.
  - Login validation, user enumeration defense, and JWT issuance with 24h expiration.
- **`src/__tests__/roleAccessControl.test.js`**:
  - `requireRole` configuration validation and fail-closed defense (HTTP 403).
  - Unauthenticated access rejection (HTTP 401).
  - Insufficient role rejection (HTTP 403) and authorized role pass-through.
  - Integration testing on `/api/auth/me` and `/api/auth/admin-test`.
- **`src/__tests__/contactSecurity.test.js`**:
  - Authentication enforcement across all contact routes (`GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`).
  - Contact ownership assignment on creation (ignoring client spoofing).
  - Cross-user data isolation on list, get, update, and delete.
  - Ownership immutability on update.
  - ObjectId format validation (HTTP 400).
