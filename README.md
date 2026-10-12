# Contact Management System

A full-stack contact management application with a React frontend, Express REST API, JWT authentication, role-based access control (RBAC), and user-isolated contacts.

## Tech Stack

- React, Vite, and React Router
- Node.js and Express
- MongoDB and Mongoose
- JWT authentication and `bcryptjs`
- Node.js built-in test runner (`node:test`), Supertest, and MongoDB Memory Server

## Prerequisites

- Node.js compatible with the versions declared by the frontend and backend dependencies
- npm
- MongoDB Atlas for deployment, or a local MongoDB instance for development
- Git

## Repository Structure

- `backend/`: Express API, authentication, contact routes/models, and backend tests
- `frontend/`: React/Vite application, pages, API services, and frontend tests

## Local Development

### 1. Configure and start the backend

From the repository root:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set:

```env
PORT=5001
MONGO_URI=your_local_or_atlas_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_ORIGIN=http://localhost:5173
```

Use a unique, strong secret in your own environment. Do not commit `.env` files or real credentials.

Start the backend:

```bash
npm run dev
```

The API listens on `http://localhost:5001` by default. Its health endpoint is `http://localhost:5001/api/health`.

### 2. Configure and start the frontend

Open another terminal from the repository root:

```bash
cd frontend
npm install
cp .env.example .env
```

The local `frontend/.env` should contain:

```env
VITE_API_URL=http://localhost:5001/api
```

Start the Vite development server:

```bash
npm run dev
```

Vite prints the local frontend URL in the terminal (normally `http://localhost:5173`). The backend's `FRONTEND_ORIGIN` must match the browser origin exactly.

## Environment Variables

| Variable | Application | Purpose |
|---|---|---|
| `PORT` | Backend | Port for the Express server; defaults to `5001` |
| `MONGO_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret used to sign and validate JWTs |
| `FRONTEND_ORIGIN` | Backend | Comma-separated list of allowed browser origins |
| `VITE_API_URL` | Frontend | Backend API base URL; must end in `/api` |

Only example values belong in this README and the tracked `.env.example` files. Store actual secrets and deployment settings in the local untracked `.env` files or the hosting platform's environment configuration.

## Production Configuration and Deployment

Deploy the backend and frontend separately. Configure their environment variables in the respective hosting dashboards; do not commit production credentials.

### Backend

Set the following in the backend hosting environment:

- `NODE_ENV=production`
- `PORT`: use the port provided by the host, if required by that platform
- `MONGO_URI`: the production MongoDB Atlas connection string
- `JWT_SECRET`: a strong, unique production secret
- `FRONTEND_ORIGIN`: the exact deployed frontend origin, including scheme and host, such as `https://your-frontend.example.com`

In production, `FRONTEND_ORIGIN` is required and every configured origin must use HTTPS. Configure only origins you control. Multiple comma-separated origins are supported for explicitly required production frontends. Localhost and loopback origins are rejected in production configuration. Requests carrying an unapproved browser `Origin` do not receive CORS permission; server-to-server requests without an `Origin` header remain supported.

The server validates the production CORS configuration before connecting to MongoDB or starting to listen. Check startup logs if configuration is rejected.

### Frontend

Set `VITE_API_URL` in the frontend build environment to the deployed backend HTTPS API base URL, ending in `/api`, for example `https://your-backend.example.com/api`.

The production Vite build fails if `VITE_API_URL` is absent, uses HTTP, points to localhost/an IP literal, or does not end in `/api`. The localhost fallback is for local development only. Because Vite embeds this value at build time, trigger a new frontend build after changing the variable.

### Post-deployment checks

After deploying, record the actual URLs in the release/submission notes; do not use placeholder URLs as if they were live.

- Open `https://your-backend.example.com/api/health` using your actual backend hostname and verify a successful health response.
- Open the deployed frontend and verify its browser requests reach the HTTPS backend without CORS or mixed-content errors.
- Test registration, login, logout, invalid/expired tokens, protected routes, contact CRUD, ownership isolation, search, company filtering, sorting, pagination, loading/empty/error states, and direct page refreshes.
- Verify production logs do not reveal credentials or stack traces to clients.
- Test the responsive UI at mobile, tablet, and desktop widths.

## Authentication

Register or log in using the authentication endpoints. Use the returned JWT in protected requests:

```http
Authorization: Bearer YOUR_TOKEN
```

### Security Features

- **JWT validation:** Rejects missing, invalid, expired, tampered, or malformed tokens.
- **Environment validation:** Requires a non-empty `JWT_SECRET` before server startup.
- **Password security:** Hashes passwords using `bcryptjs`.
- **Input validation:** Validates required registration fields and email format.
- **Response sanitization:** Prevents password hashes from being returned to clients.
- **Privilege escalation prevention:** Registration assigns the `User` role regardless of any client-supplied role.

## Role-Based Access Control (RBAC)

The API uses role-based authorization to restrict protected operations.

- `GET /api/auth/me`: Returns the authenticated user's identity.
- `GET /api/auth/admin-test`: Restricted to users with the `Admin` role.

Unauthenticated requests are rejected, and users without the required role receive an authorization error.

## Contact API

Base URL: `/api/contacts`. Contact endpoints require authentication.

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
- `email`: Optional; must be valid when provided.
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

## Automated Tests

### Backend unit/security tests

From `backend/`:

```bash
npm test
```

### Backend in-memory integration tests

From `backend/`:

```bash
npm run test:integration
```

### Backend live end-to-end tests

From `backend/`:

```bash
npm run test:e2e
```

This test uses a local MongoDB instance at `mongodb://127.0.0.1:27017` and the isolated database `cms_e2e_isolated_test_db`. Do not repoint this destructive test at a development or production database.

### Frontend tests, lint, and production build

From `frontend/`:

```bash
npm test
npm run lint
npm run build
```

A production build requires a valid HTTPS `VITE_API_URL` pointing to the deployed backend API base URL. For local work, the example environment file uses `http://localhost:5001/api`.

## Known Limitations

Company filter discovery is bounded to a maximum of 10 pages (up to 1,000 contacts), as implemented by the current frontend. Document any deployment-specific or additional limitations discovered during acceptance testing.

## Health Check

```http
GET /api/health
```

Returns `{ "status": "OK" }`.
