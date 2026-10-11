# Contact Management System

A secure contact management REST API with JWT authentication, role-based access control (RBAC), and user-isolated contact management.

## Tech Stack

- Node.js and Express
- MongoDB and Mongoose
- JWT authentication and `bcryptjs`
- Jest, Supertest, and MongoDB Memory Server for Issue #7 API tests
- Node.js built-in test runner for authentication and security tests

## Setup

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create `backend/.env` using `backend/.env.example` as a reference:

   ```env
   PORT=5001
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_secret
   ```

3. Start the backend:

   ```bash
   npm run dev
   ```

The API runs on `http://localhost:5001` by default.

## Authentication

Register or log in using the authentication endpoints. Use the returned JWT in protected requests:

```http
Authorization: Bearer YOUR_TOKEN
```

### Security Features

- **JWT validation:** Rejects missing, invalid, expired, tampered, or malformed tokens.
- **Environment validation:** Requires a non-empty `JWT_SECRET` before server startup.
- **Payload validation:** Validates user ObjectIds and permits only supported roles.
- **Password security:** Hashes passwords using `bcryptjs` with salt rounds of 10.
- **Input validation:** Validates required registration fields and email format.
- **Response sanitization:** Prevents password hashes from being returned to clients.
- **User enumeration protection:** Uses generic login errors for nonexistent accounts and incorrect passwords.
- **Privilege escalation prevention:** Registration assigns the `User` role regardless of any client-supplied role.

## Role-Based Access Control (RBAC)

The API uses role-based authorization to restrict protected operations.

- `GET /api/auth/me`: Returns the authenticated user's identity.
- `GET /api/auth/admin-test`: Restricted to users with the `Admin` role.

Unauthenticated requests are rejected, and users without the required role receive an authorization error.

## Contact API

Base URL: `/api/contacts`

All contact endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/contacts` | Create a contact |
| GET | `/api/contacts` | List contacts with search, filtering, sorting, and pagination |
| GET | `/api/contacts/:id` | Get one contact |
| PUT | `/api/contacts/:id` | Update a contact |
| DELETE | `/api/contacts/:id` | Delete a contact |

### Contact Fields

- `name`: Required, non-empty string.
- `phone`: Required, non-empty string.
- `email`: Optional; must be a valid email when provided.
- `company`: Optional string.
- `owner`: Assigned from the authenticated user; client-supplied ownership is not trusted.

### Search, Filtering, Sorting, and Pagination

Example request:

```http
GET /api/contacts?search=Kabir&company=OpenAI&sortBy=name&order=asc&page=1&limit=10
```

| Parameter | Description |
|---|---|
| `search` | Searches contact name, email, phone, and company |
| `company` | Filters by company |
| `sortBy` | `name`, `company`, or `createdAt` |
| `order` | `asc` or `desc` |
| `page` | Page number; defaults to `1` |
| `limit` | Results per page; defaults to `10`, maximum `100` |

The list response contains `contacts` and `pagination` metadata, including `total`, `page`, `limit`, and `totalPages`. Queries with no matches return an empty contact list.

### Contact Security and Ownership

- All contact routes require valid JWT authentication.
- Users can list and access only their own contacts.
- Contact ownership is assigned from the authenticated user's identity.
- Updating a contact cannot change its owner.
- Attempts to access, update, or delete another user's contact return `404`.
- Malformed contact IDs return `400`.

### Errors

The API uses appropriate HTTP status codes, including:

- `400`: Invalid input or query parameters.
- `401`: Missing or invalid authentication.
- `403`: Insufficient permissions.
- `404`: Contact not found or not owned by the current user.
- `500`: Server configuration or internal error.

## Automated Tests

Run Issue #7 API tests from the `backend` directory:

```bash
npm test
```

This command uses Jest and Supertest, configured to run serially with `--runInBand`. The Issue #7 test suite uses MongoDB Memory Server for isolated database testing.

### Authentication and Security Test Coverage

The security tests are located in `backend/src/__tests__/`.

- **`jwtValidation.test.js`:** Tests missing and malformed authorization headers, token signatures, expiration, payload validation, and missing JWT configuration.
- **`authSecurity.test.js`:** Tests registration validation, duplicate emails, password hashing, login behavior, role escalation prevention, and response sanitization.
- **`roleAccessControl.test.js`:** Tests role validation, unauthorized access, and protected authentication endpoints.
- **`contactSecurity.test.js`:** Tests contact authentication, ownership assignment, cross-user isolation, ownership immutability, and contact ID validation.
- **`testHelper.js`:** Provides shared helpers for security tests.

Run the built-in Node.js tests directly with:

```bash
node --test
```

The security test suite uses mocked database behavior for isolated tests. Automated tests do not, by themselves, establish that a live MongoDB Atlas deployment or external network connectivity works.

## Health Check

```http
GET /api/health
```

Returns the API health status.
