## Backend Testing

Run backend commands from the `backend/` directory unless a command explicitly says otherwise.

### Prerequisites

- Install the Node.js version supported by this project.
- Install backend dependencies with `npm install`.
- Configure the environment variables required by the backend.
- Tests that access MongoDB require a reachable test database and valid test configuration. Do not use a production database for tests.

The server requires `JWT_SECRET` and `MONGO_URI` to be configured. The development server uses port `5001` by default unless overridden by `PORT`.

### Test commands

Run the Node.js built-in security tests:

```bash
npm test
```

This command runs the test files in `src/__tests__/*.test.js` with Node's built-in test runner.

Run the Jest integration tests:

```bash
npm run test:integration
```

This command runs the Jest integration suite at `tests/contact.test.js` in-band.

Run both suites:

```bash
npm run test:all
```

The combined command runs `npm test` first and then runs the integration suite. It stops and returns a failure if either command fails.

### Interpreting results

A successful test run exits with status code `0`. Review the test output for failed assertions, unhandled errors, open asynchronous operations, or database setup/teardown failures. Do not treat a test run interrupted with Control+C as successful.

### Contact list API

The contact-list endpoint is `GET /api/contacts`. Requests must include valid authentication, and contact queries must be restricted to the authenticated user's contacts.

The list endpoint supports search, company filtering, sorting, and pagination as implemented by the backend controller. Refer to the current controller and its tests for the exact accepted query parameter names, sort fields, default values, maximum page size, and pagination metadata.

A successful list response contains `contacts` and `pagination` fields. Use the actual controller response and integration tests as the source of truth for the complete response contract.
