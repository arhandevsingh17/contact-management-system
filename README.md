# Contact Management System

A REST API for managing personal contacts. Users must authenticate, and each user can access only their own contacts.

## Tech Stack

- Node.js and Express
- MongoDB and Mongoose
- JWT authentication
- Jest, Supertest, and MongoDB Memory Server for automated API tests

## Setup

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create `backend/.env` using `backend/.env.example` as a reference. Configure:

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

### Contact fields

- `name`: required, non-empty string
- `phone`: required, non-empty string
- `email`: optional; must be a valid email when provided
- `company`: optional string
- `owner`: assigned from the authenticated user; client-supplied ownership is not trusted

### Search, filtering, sorting, and pagination

Example:

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

The list response contains `contacts` and `pagination` metadata, including `total`, `page`, `limit`, and `totalPages`. A query with no matches returns an empty contact list.

### Errors and access control

Responses use HTTP status codes such as `400` for invalid input, `401` for missing or invalid authentication, and `404` when a requested contact is not found or is not owned by the current user.

## Automated tests

Run from the `backend` directory:

```bash
npm test
```

The tests use an isolated in-memory MongoDB database. Do not point automated tests at a production database.

## Health check

```http
GET /api/health
```

Returns a basic API health status.
