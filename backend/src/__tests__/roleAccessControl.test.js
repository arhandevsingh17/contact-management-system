const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const requireRole = require("../middleware/roleMiddleware");
const app = require("../server");
const {
  TEST_JWT_SECRET,
  USER_1_ID,
  ADMIN_ID,
  generateToken,
  createMockReqRes,
  makeRequest,
} = require("./testHelper");

describe("Role-Based Access Control (RBAC) Tests", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe("requireRole Middleware Configuration Validation", () => {
    it("should fail closed with 403 if configured with no roles", () => {
      const middleware = requireRole();
      const { req, res } = createMockReqRes({
        user: { id: ADMIN_ID, role: "Admin" },
      });
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res._body, {
        message: "Access forbidden: invalid role configuration",
      });
    });

    it("should fail closed with 403 if configured with unsupported role names", () => {
      const middleware = requireRole("SuperAdmin", "Moderator");
      const { req, res } = createMockReqRes({
        user: { id: ADMIN_ID, role: "Admin" },
      });
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res._body, {
        message: "Access forbidden: invalid role configuration",
      });
    });

    it("should fail closed with 403 if configured with non-string role arguments", () => {
      const middleware = requireRole(12345);
      const { req, res } = createMockReqRes({
        user: { id: ADMIN_ID, role: "Admin" },
      });
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res._body, {
        message: "Access forbidden: invalid role configuration",
      });
    });
  });

  describe("requireRole Middleware Enforcement", () => {
    it("should return 401 when req.user is missing", () => {
      const middleware = requireRole("Admin");
      const { req, res } = createMockReqRes();
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authentication required" });
    });

    it("should return 401 when req.user.role is missing", () => {
      const middleware = requireRole("Admin");
      const { req, res } = createMockReqRes({ user: { id: USER_1_ID } });
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authentication required" });
    });

    it("should block 'User' role from accessing 'Admin' protected resource with 403", () => {
      const middleware = requireRole("Admin");
      const { req, res } = createMockReqRes({
        user: { id: USER_1_ID, role: "User" },
      });
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.deepStrictEqual(res._body, {
        message: "Access forbidden: insufficient permissions",
      });
    });

    it("should allow 'Admin' role to proceed to next handler", () => {
      const middleware = requireRole("Admin");
      const { req, res } = createMockReqRes({
        user: { id: ADMIN_ID, role: "Admin" },
      });
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    it("should allow both 'Admin' and 'User' when configured with multiple roles", () => {
      const middleware = requireRole("Admin", "User");

      // Test User
      const userReq = createMockReqRes({
        user: { id: USER_1_ID, role: "User" },
      });
      let userNext = false;
      middleware(userReq.req, userReq.res, () => {
        userNext = true;
      });
      assert.strictEqual(userNext, true);

      // Test Admin
      const adminReq = createMockReqRes({
        user: { id: ADMIN_ID, role: "Admin" },
      });
      let adminNext = false;
      middleware(adminReq.req, adminReq.res, () => {
        adminNext = true;
      });
      assert.strictEqual(adminNext, true);
    });
  });

  describe("API Endpoints RBAC Integration (/api/auth/me & /api/auth/admin-test)", () => {
    it("GET /api/auth/me should return 401 without authentication", async () => {
      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/auth/me",
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, { message: "Authorization token required" });
    });

    it("GET /api/auth/me should return authenticated user identity for regular User", async () => {
      const token = generateToken({ id: USER_1_ID, role: "User" });
      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, {
        user: {
          id: USER_1_ID,
          role: "User",
        },
      });
    });

    it("GET /api/auth/admin-test should return 401 without authentication", async () => {
      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/auth/admin-test",
      });

      assert.strictEqual(res.status, 401);
      assert.deepStrictEqual(res.body, { message: "Authorization token required" });
    });

    it("GET /api/auth/admin-test should return 403 Forbidden for User role", async () => {
      const userToken = generateToken({ id: USER_1_ID, role: "User" });
      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/auth/admin-test",
        headers: { authorization: `Bearer ${userToken}` },
      });

      assert.strictEqual(res.status, 403);
      assert.deepStrictEqual(res.body, {
        message: "Access forbidden: insufficient permissions",
      });
    });

    it("GET /api/auth/admin-test should return 200 OK for Admin role", async () => {
      const adminToken = generateToken({ id: ADMIN_ID, role: "Admin" });
      const res = await makeRequest(app, {
        method: "GET",
        url: "/api/auth/admin-test",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.message, "Admin access granted");
      assert.strictEqual(res.body.user.role, "Admin");
      assert.strictEqual(res.body.user.id, ADMIN_ID);
    });
  });
});
