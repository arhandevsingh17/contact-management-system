const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert");
const Contact = require("../models/Contact");
const app = require("../server");
const {
  TEST_JWT_SECRET,
  USER_1_ID,
  USER_2_ID,
  CONTACT_1_ID,
  CONTACT_2_ID,
  generateToken,
  makeRequest,
} = require("./testHelper");

describe("Contact Security and Cross-User Access Isolation", () => {
  const originalSecret = process.env.JWT_SECRET;
  let user1Token;
  let user2Token;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    user1Token = generateToken({ id: USER_1_ID, role: "User" });
    user2Token = generateToken({ id: USER_2_ID, role: "User" });
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    mock.reset();
  });

  describe("Authentication Enforcement on All Contact Endpoints", () => {
    it("POST /api/contacts should reject unauthenticated requests with 401", async () => {
      const res = await makeRequest(app, {
        method: "POST",
        url: "/api/contacts",
        body: { name: "John Doe", phone: "1234567890" },
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, {
        message: "Authorization token required",
      });
    });

    it("GET /api/contacts should reject unauthenticated requests with 401", async () => {
      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/contacts",
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, {
        message: "Authorization token required",
      });
    });

    it("GET /api/contacts/:id should reject unauthenticated requests with 401", async () => {
      const res = await makeRequest(app, {
        method: "GET",
        url: `/api/contacts/${CONTACT_1_ID}`,
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, {
        message: "Authorization token required",
      });
    });

    it("PUT /api/contacts/:id should reject unauthenticated requests with 401", async () => {
      const res = await makeRequest(app, {
        method: "PUT",
        url: `/api/contacts/${CONTACT_1_ID}`,
        body: { name: "Updated Name" },
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, {
        message: "Authorization token required",
      });
    });

    it("DELETE /api/contacts/:id should reject unauthenticated requests with 401", async () => {
      const res = await makeRequest(app, {
        method: "DELETE",
        url: `/api/contacts/${CONTACT_1_ID}`,
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, {
        message: "Authorization token required",
      });
    });

    it("should reject requests with invalid or expired tokens on contact routes", async () => {
      const expiredToken = generateToken({
        id: USER_1_ID,
        role: "User",
        expiresIn: "-1s",
      });

      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/contacts",
        headers: { authorization: `Bearer ${expiredToken}` },
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, { message: "Token has expired" });
    });
  });

  describe("Cross-User Isolation and Ownership Enforcements", () => {
    it("POST /api/contacts must strictly set owner to authenticated user, ignoring client-supplied owner", async () => {
      let savedContactData = null;

      mock.method(Contact.prototype, "save", async function () {
        savedContactData = this;
        return this;
      });

      const res = await makeRequest(app, {
        method: "POST",
        url: "/api/contacts",
        headers: { authorization: `Bearer ${user1Token}` },
        body: {
          name: "Alice Smith",
          email: "alice@example.com",
          phone: "9876543210",
          company: "Acme Corp",
          owner: USER_2_ID,
        },
      });

      assert.strictEqual(res.status, 201);
      assert.notStrictEqual(savedContactData, null);
      assert.strictEqual(String(savedContactData.owner), USER_1_ID);
      assert.notStrictEqual(String(savedContactData.owner), USER_2_ID);
    });

    it("GET /api/contacts must scope queries strictly to the authenticated user", async () => {
      let queriedFilter = null;

      mock.method(Contact, "find", (filter) => {
        queriedFilter = filter;

        return {
          sort() {
            return this;
          },
          skip() {
            return this;
          },
          limit: async () => [
            {
              _id: CONTACT_1_ID,
              name: "User1 Contact",
              phone: "1112223333",
              owner: USER_1_ID,
            },
          ],
        };
      });

      mock.method(Contact, "countDocuments", async () => 1);

      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/contacts",
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(queriedFilter, { owner: USER_1_ID });
      assert.strictEqual(res.body.contacts.length, 1);
      assert.strictEqual(res.body.contacts[0].name, "User1 Contact");
    });

    it("GET /api/contacts/:id must return 404 when requesting another user's contact", async () => {
      let searchedQuery = null;

      mock.method(Contact, "findOne", async (query) => {
        searchedQuery = query;

        if (query._id === CONTACT_2_ID && query.owner === USER_1_ID) {
          return null;
        }

        return { _id: query._id, owner: query.owner };
      });

      const res = await makeRequest(app, {
        method: "GET",
        url: `/api/contacts/${CONTACT_2_ID}`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { message: "Contact not found" });
      assert.deepStrictEqual(searchedQuery, {
        _id: CONTACT_2_ID,
        owner: USER_1_ID,
      });
    });

    it("PUT /api/contacts/:id must return 404 when attempting to update another user's contact", async () => {
      mock.method(Contact, "findOne", async () => null);

      const res = await makeRequest(app, {
        method: "PUT",
        url: `/api/contacts/${CONTACT_2_ID}`,
        headers: { authorization: `Bearer ${user1Token}` },
        body: { name: "Malicious Rename" },
      });

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { message: "Contact not found" });
    });

    it("PUT /api/contacts/:id must reject attempts to modify contact ownership", async () => {
      let findOneCalled = false;

      mock.method(Contact, "findOne", async () => {
        findOneCalled = true;
        return null;
      });

      const res = await makeRequest(app, {
        method: "PUT",
        url: `/api/contacts/${CONTACT_1_ID}`,
        headers: { authorization: `Bearer ${user1Token}` },
        body: {
          name: "Updated Contact Name",
          owner: USER_2_ID,
        },
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(findOneCalled, false);
      assert.deepStrictEqual(res.body, {
        message: "Request contains unsupported fields",
      });
    });

    it("DELETE /api/contacts/:id must return 404 when attempting to delete another user's contact", async () => {
      let queriedDelete = null;

      mock.method(Contact, "findOneAndDelete", async (query) => {
        queriedDelete = query;
        return null;
      });

      const res = await makeRequest(app, {
        method: "DELETE",
        url: `/api/contacts/${CONTACT_2_ID}`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 404);
      assert.deepStrictEqual(res.body, { message: "Contact not found" });
      assert.deepStrictEqual(queriedDelete, {
        _id: CONTACT_2_ID,
        owner: USER_1_ID,
      });
    });

    it("DELETE /api/contacts/:id must successfully delete when contact belongs to authenticated user", async () => {
      mock.method(Contact, "findOneAndDelete", async (query) => {
        if (query._id === CONTACT_1_ID && query.owner === USER_1_ID) {
          return { _id: CONTACT_1_ID, owner: USER_1_ID };
        }

        return null;
      });

      const res = await makeRequest(app, {
        method: "DELETE",
        url: `/api/contacts/${CONTACT_1_ID}`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, {
        message: "Contact deleted successfully",
      });
    });

    it("should return 400 for invalid contact ID format on GET, PUT, and DELETE", async () => {
      const invalidIds = [
        "123",
        "not-a-valid-hex-id",
        "507f1f77bcf86cd79943901z",
      ];

      for (const id of invalidIds) {
        const getRes = await makeRequest(app, {
          method: "GET",
          url: `/api/contacts/${id}`,
          headers: { authorization: `Bearer ${user1Token}` },
        });

        assert.strictEqual(getRes.status, 400);
        assert.deepStrictEqual(getRes.body, {
          message: "Invalid contact ID",
        });

        const putRes = await makeRequest(app, {
          method: "PUT",
          url: `/api/contacts/${id}`,
          headers: { authorization: `Bearer ${user1Token}` },
          body: { name: "Valid Name" },
        });

        assert.strictEqual(putRes.status, 400);
        assert.deepStrictEqual(putRes.body, {
          message: "Invalid contact ID",
        });

        const delRes = await makeRequest(app, {
          method: "DELETE",
          url: `/api/contacts/${id}`,
          headers: { authorization: `Bearer ${user1Token}` },
        });

        assert.strictEqual(delRes.status, 400);
        assert.deepStrictEqual(delRes.body, {
          message: "Invalid contact ID",
        });
      }
    });
  });
});
