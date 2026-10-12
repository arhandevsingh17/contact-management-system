const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

// Strictly use an isolated test database to protect dev and prod data
const ISOLATED_TEST_DB_URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/cms_e2e_isolated_test_db";
process.env.JWT_SECRET = "super-secret-jwt-key-for-e2e-tests";

const app = require("../src/app");
const User = require("../src/models/User");
const Contact = require("../src/models/Contact");

describe("Live Backend End-to-End Integration Tests (Isolated DB)", () => {
  let server;
  let baseUrl;

  before(async () => {
    // Safety guard: ensure the URI targets only the isolated test database
    assert.ok(
      ISOLATED_TEST_DB_URI.includes("cms_e2e_isolated_test_db"),
      "Safety violation: must connect strictly to cms_e2e_isolated_test_db"
    );

    // 1. Connect Mongoose to the isolated test database
    await mongoose.connect(ISOLATED_TEST_DB_URI);
    assert.equal(mongoose.connection.name, "cms_e2e_isolated_test_db");

    await User.deleteMany({});
    await Contact.deleteMany({});

    // 2. Start live HTTP server on random available port
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up isolated test database, drop it, and shut down server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      assert.equal(mongoose.connection.name, "cms_e2e_isolated_test_db");
      await User.deleteMany({});
      await Contact.deleteMany({});
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  const requestJson = async (endpoint, options = {}) => {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const config = {
      method: options.method || "GET",
      headers,
    };
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, config);
    let data = null;
    const ct = res.headers.get("content-type");
    if (ct && ct.includes("application/json")) {
      data = await res.json();
    }
    return {
      status: res.status,
      body: data,
    };
  };

  const testUser = {
    name: "E2E Tester",
    email: "e2e_tester@example.com",
    password: "Password123!",
  };

  let authToken = null;
  let testContactId = null;

  // 1. Registration
  test("Auth: POST /api/auth/register successfully creates user and enforces User role", async () => {
    const res = await requestJson("/api/auth/register", {
      method: "POST",
      body: { ...testUser, role: "Admin" }, // client role escalation attempt
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.message, "User registered successfully");
    assert.equal(res.body.user.email, testUser.email);
    assert.equal(res.body.user.role, "User"); // strictly 'User'
    assert.equal(res.body.user.password, undefined); // password sanitized
  });

  test("Auth: POST /api/auth/register rejects duplicate email with 409 Conflict", async () => {
    const res = await requestJson("/api/auth/register", {
      method: "POST",
      body: testUser,
    });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already registered/);
  });

  test("Auth: POST /api/auth/register rejects invalid email format with 400 Bad Request", async () => {
    const res = await requestJson("/api/auth/register", {
      method: "POST",
      body: { name: "Bob", email: "invalid-email-format", password: "Password123!" },
    });

    assert.equal(res.status, 400);
  });

  // 2. Login
  test("Auth: POST /api/auth/login validates credentials and returns signed JWT", async () => {
    const res = await requestJson("/api/auth/login", {
      method: "POST",
      body: { email: testUser.email, password: testUser.password },
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testUser.email);
    authToken = res.body.token;
  });

  test("Auth: POST /api/auth/login rejects wrong password with generic 401", async () => {
    const res = await requestJson("/api/auth/login", {
      method: "POST",
      body: { email: testUser.email, password: "wrong-password" },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.message, "Invalid email or password");
  });

  // 3. Current session validation (GET /api/auth/me)
  test("Auth: GET /api/auth/me validates current session with Bearer token", async () => {
    const res = await requestJson("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.user.id);
    assert.equal(res.body.user.role, "User");
  });

  test("Auth: GET /api/auth/me rejects missing or invalid token with 401", async () => {
    const resNoToken = await requestJson("/api/auth/me");
    assert.equal(resNoToken.status, 401);

    const resBadToken = await requestJson("/api/auth/me", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    assert.equal(resBadToken.status, 401);
  });

  // 4. Contact CRUD
  test("Contacts: POST /api/contacts creates a contact belonging to authenticated user", async () => {
    const res = await requestJson("/api/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        name: "Alice Johnson",
        phone: "+1-555-0100",
        email: "alice@acme.com",
        company: "Acme Corp",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.contact.name, "Alice Johnson");
    assert.equal(res.body.contact.company, "Acme Corp");
    testContactId = res.body.contact._id;
  });

  test("Contacts: POST /api/contacts rejects missing name or phone with 400 Bad Request", async () => {
    const res = await requestJson("/api/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: { name: "", phone: "" },
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Name and phone are required/);
  });

  test("Contacts: GET /api/contacts/:id retrieves the created contact", async () => {
    const res = await requestJson(`/api/contacts/${testContactId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.status, 200);
    const retrievedContact = res.body.contact || res.body;
    assert.equal(retrievedContact.name, "Alice Johnson");
  });

  test("Contacts: PUT /api/contacts/:id updates contact details", async () => {
    const res = await requestJson(`/api/contacts/${testContactId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        name: "Alice M. Johnson",
        company: "Acme Global",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.contact.name, "Alice M. Johnson");
    assert.equal(res.body.contact.company, "Acme Global");
  });

  // Seed additional contacts for sorting, search, filtering, and pagination
  test("Contacts: Seed contacts for server-side search, filtering, and sorting", async () => {
    const seedList = [
      { name: "Bob Smith", phone: "555-0200", email: "bob@beta.org", company: "Beta LLC" },
      { name: "Charlie Brown", phone: "555-0300", email: "charlie@acme.com", company: "Acme Global" },
      { name: "Diana Prince", phone: "555-0400", email: "diana@themyscira.io", company: "Amazon" },
      { name: "Evan Wright", phone: "555-0500", email: "evan@beta.org", company: "Beta LLC" },
    ];

    for (const c of seedList) {
      const res = await requestJson("/api/contacts", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: c,
      });
      assert.equal(res.status, 201);
    }
  });

  // 5. Server-side Search & Company Filters
  test("Contacts: GET /api/contacts?search=... performs server-side search across fields", async () => {
    // Search by name
    const resName = await requestJson("/api/contacts?search=Charlie", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resName.status, 200);
    assert.equal(resName.body.contacts.length, 1);
    assert.equal(resName.body.contacts[0].name, "Charlie Brown");

    // Search by phone snippet
    const resPhone = await requestJson("/api/contacts?search=0400", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resPhone.status, 200);
    assert.equal(resPhone.body.contacts.length, 1);
    assert.equal(resPhone.body.contacts[0].name, "Diana Prince");
  });

  test("Contacts: GET /api/contacts?company=... filters by exact company name", async () => {
    const resComp = await requestJson("/api/contacts?company=Beta%20LLC", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resComp.status, 200);
    assert.equal(resComp.body.contacts.length, 2);
    assert.ok(resComp.body.contacts.every((c) => c.company === "Beta LLC"));
  });

  test("Contacts: Combined search and company filter", async () => {
    const resCombined = await requestJson("/api/contacts?search=Evan&company=Beta%20LLC", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resCombined.status, 200);
    assert.equal(resCombined.body.contacts.length, 1);
    assert.equal(resCombined.body.contacts[0].name, "Evan Wright");

    // Mismatched search & company should yield 0 results
    const resMismatch = await requestJson("/api/contacts?search=Alice&company=Beta%20LLC", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resMismatch.status, 200);
    assert.equal(resMismatch.body.contacts.length, 0);
  });

  // 6. Sorting
  test("Contacts: GET /api/contacts?sortBy=name&order=asc sorts alphabetically", async () => {
    const res = await requestJson("/api/contacts?sortBy=name&order=asc&limit=10", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const names = res.body.contacts.map((c) => c.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(names, sortedNames);
  });

  test("Contacts: GET /api/contacts?sortBy=name&order=desc sorts reverse-alphabetically", async () => {
    const res = await requestJson("/api/contacts?sortBy=name&order=desc&limit=10", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    const names = res.body.contacts.map((c) => c.name);
    const revSorted = [...names].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(names, revSorted);
  });

  // 7. Pagination
  test("Contacts: GET /api/contacts?page=1&limit=2 returns paginated metadata", async () => {
    const resPage1 = await requestJson("/api/contacts?page=1&limit=2", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resPage1.status, 200);
    assert.equal(resPage1.body.contacts.length, 2);
    assert.equal(resPage1.body.pagination.total, 5);
    assert.equal(resPage1.body.pagination.page, 1);
    assert.equal(resPage1.body.pagination.limit, 2);
    assert.equal(resPage1.body.pagination.totalPages, 3);

    const resPage2 = await requestJson("/api/contacts?page=2&limit=2", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resPage2.status, 200);
    assert.equal(resPage2.body.contacts.length, 2);
    assert.equal(resPage2.body.pagination.page, 2);
  });

  // 8. Delete contact
  test("Contacts: DELETE /api/contacts/:id removes contact successfully", async () => {
    const res = await requestJson(`/api/contacts/${testContactId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, "Contact deleted successfully");

    // Verifying it is gone
    const resCheck = await requestJson(`/api/contacts/${testContactId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resCheck.status, 404);
  });

  // 9. Error handling
  test("Errors: 400 on invalid sortBy, 400 on invalid order, 400 on invalid ObjectId", async () => {
    const resBadSort = await requestJson("/api/contacts?sortBy=hack", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resBadSort.status, 400);

    const resBadOrder = await requestJson("/api/contacts?order=sideways", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resBadOrder.status, 400);

    const resBadId = await requestJson("/api/contacts/invalid-mongo-id", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(resBadId.status, 400);
  });
});
