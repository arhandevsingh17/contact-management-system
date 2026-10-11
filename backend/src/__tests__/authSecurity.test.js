const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { register, login } = require("../controllers/authController");
const {
  TEST_JWT_SECRET,
  USER_1_ID,
  createMockReqRes,
} = require("./testHelper");

describe("Authentication Security Tests", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    mock.reset();
  });

  describe("Registration Input Validation & Defenses", () => {
    it("should return 400 when request body is empty or missing name", async () => {
      const { req, res } = createMockReqRes({
        method: "POST",
        body: { email: "test@example.com", password: "Password123!" },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res._body, { message: "Name is required" });
    });

    it("should return 400 when name is whitespace-only", async () => {
      const { req, res } = createMockReqRes({
        method: "POST",
        body: { name: "   ", email: "test@example.com", password: "Password123!" },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res._body, { message: "Name is required" });
    });

    it("should return 400 when email is missing or whitespace-only", async () => {
      const { req, res } = createMockReqRes({
        method: "POST",
        body: { name: "Test User", email: "   ", password: "Password123!" },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res._body, { message: "Email is required" });
    });

    it("should return 400 when email format is invalid", async () => {
      const invalidEmails = [
        "notanemail",
        "user@",
        "@domain.com",
        "user@domain",
        "user space@domain.com",
      ];

      for (const email of invalidEmails) {
        const { req, res } = createMockReqRes({
          method: "POST",
          body: { name: "Test User", email, password: "Password123!" },
        });

        await register(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for email: ${email}`);
        assert.deepStrictEqual(res._body, {
          message: "Please provide a valid email address",
        });
      }
    });

    it("should return 400 when password is missing or whitespace-only", async () => {
      const { req, res } = createMockReqRes({
        method: "POST",
        body: { name: "Test User", email: "test@example.com", password: "   " },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.deepStrictEqual(res._body, { message: "Password is required" });
    });

    it("should return 409 Conflict when user with email already exists", async () => {
      mock.method(User, "findOne", async () => {
        return { _id: USER_1_ID, email: "existing@example.com" };
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: {
          name: "Duplicate User",
          email: "existing@example.com",
          password: "Password123!",
        },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 409);
      assert.deepStrictEqual(res._body, { message: "Email is already registered" });
    });

    it("should handle MongoDB duplicate key error (code 11000) with 409 Conflict", async () => {
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async () => {
        const dupError = new Error("E11000 duplicate key error collection");
        dupError.code = 11000;
        throw dupError;
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: {
          name: "Race Condition User",
          email: "race@example.com",
          password: "Password123!",
        },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 409);
      assert.deepStrictEqual(res._body, { message: "Email is already registered" });
    });

    it("should handle Mongoose schema ValidationError with 400 Bad Request", async () => {
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async () => {
        const valError = new Error("Validation failed on path email");
        valError.name = "ValidationError";
        throw valError;
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: {
          name: "Invalid User",
          email: "validformat@example.com",
          password: "Password123!",
        },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._body.message, "Validation failed on path email");
    });
  });

  describe("Registration Privilege Escalation and Password Security", () => {
    it("should ignore client-supplied role: 'Admin' and strictly persist role as 'User'", async () => {
      let createdUserData = null;
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async (data) => {
        createdUserData = data;
        return {
          _id: USER_1_ID,
          name: data.name,
          email: data.email,
          role: data.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: {
          name: "Attacker",
          email: "attacker@example.com",
          password: "SecretPassword123!",
          role: "Admin", // Attempting privilege escalation
        },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 201);
      assert.notStrictEqual(createdUserData, null);
      assert.strictEqual(
        createdUserData.role,
        "User",
        "Role must be forced to 'User', ignoring client input"
      );
      assert.strictEqual(res._body.user.role, "User");
    });

    it("should store a bcrypt password hash, never the plaintext password", async () => {
      let createdUserData = null;
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async (data) => {
        createdUserData = data;
        return {
          _id: USER_1_ID,
          name: data.name,
          email: data.email,
          role: data.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const plaintextPassword = "SuperSecurePassword123!";
      const { req, res } = createMockReqRes({
        method: "POST",
        body: {
          name: "Alice",
          email: "alice@example.com",
          password: plaintextPassword,
        },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 201);
      assert.notStrictEqual(createdUserData.password, plaintextPassword);
      assert.ok(
        createdUserData.password.startsWith("$2"),
        "Stored password must be a valid bcrypt hash"
      );
      const isMatch = await bcrypt.compare(
        plaintextPassword,
        createdUserData.password
      );
      assert.strictEqual(isMatch, true, "Bcrypt hash must match original password");
    });

    it("should sanitize the registration response (no password or hash returned)", async () => {
      mock.method(User, "findOne", async () => null);
      mock.method(User, "create", async (data) => {
        return {
          _id: USER_1_ID,
          name: data.name,
          email: data.email,
          password: data.password, // model document has password
          role: data.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: {
          name: "Bob",
          email: "bob@example.com",
          password: "MySecretPassword123!",
        },
      });

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res._body.user.password, undefined);
      assert.strictEqual(res._body.user.hash, undefined);
      assert.strictEqual(res._body.password, undefined);
    });
  });

  describe("Login Security, Authentication & User Enumeration Defense", () => {
    it("should return 400 when email or password is missing", async () => {
      const cases = [
        {},
        { email: "user@example.com" },
        { password: "password" },
      ];

      for (const body of cases) {
        const { req, res } = createMockReqRes({ method: "POST", body });
        await login(req, res, () => {});
        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res._body, {
          message: "Email and password are required",
        });
      }
    });

    it("should return 400 when email or password is whitespace-only", async () => {
      const cases = [
        { email: "   ", password: "password" },
        { email: "user@example.com", password: "   " },
        { email: "   ", password: "   " },
      ];

      for (const body of cases) {
        const { req, res } = createMockReqRes({ method: "POST", body });
        await login(req, res, () => {});
        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res._body, {
          message: "Email and password are required",
        });
      }
    });

    it("should pass 500 error to next handler when JWT_SECRET is unconfigured", async () => {
      delete process.env.JWT_SECRET;
      const { req, res } = createMockReqRes({
        method: "POST",
        body: { email: "user@example.com", password: "password123" },
      });

      let passedErr = null;
      await login(req, res, (err) => {
        passedErr = err;
      });

      assert.notStrictEqual(passedErr, null);
      assert.strictEqual(passedErr.status, 500);
      assert.strictEqual(passedErr.message, "JWT secret is not configured on the server");
    });

    it("should pass 500 error to next handler when JWT_SECRET is blank or whitespace", async () => {
      process.env.JWT_SECRET = "   ";
      const { req, res } = createMockReqRes({
        method: "POST",
        body: { email: "user@example.com", password: "password123" },
      });

      let passedErr = null;
      await login(req, res, (err) => {
        passedErr = err;
      });

      assert.notStrictEqual(passedErr, null);
      assert.strictEqual(passedErr.status, 500);
      assert.strictEqual(passedErr.message, "JWT secret is not configured on the server");
    });

    it("should return generic 401 when email is not found", async () => {
      mock.method(User, "findOne", async () => null);

      const { req, res } = createMockReqRes({
        method: "POST",
        body: { email: "nonexistent@example.com", password: "anyPassword" },
      });

      await login(req, res, () => {});

      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid email or password" });
    });

    it("should return generic 401 when password does not match", async () => {
      const hashedPassword = await bcrypt.hash("CorrectPassword123!", 10);
      mock.method(User, "findOne", async () => {
        return {
          _id: USER_1_ID,
          email: "user@example.com",
          password: hashedPassword,
          role: "User",
        };
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: { email: "user@example.com", password: "WrongPassword" },
      });

      await login(req, res, () => {});

      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid email or password" });
    });

    it("should defend against user enumeration by returning identical 401 message for both invalid email and wrong password", async () => {
      // 1. Unknown user
      mock.method(User, "findOne", async () => null);
      const req1 = createMockReqRes({
        method: "POST",
        body: { email: "nobody@example.com", password: "SomePassword123" },
      });
      await login(req1.req, req1.res, () => {});

      // 2. Existing user, wrong password
      mock.reset();
      const hashedPassword = await bcrypt.hash("CorrectPassword123!", 10);
      mock.method(User, "findOne", async () => {
        return {
          _id: USER_1_ID,
          email: "existing@example.com",
          password: hashedPassword,
          role: "User",
        };
      });
      const req2 = createMockReqRes({
        method: "POST",
        body: { email: "existing@example.com", password: "WrongPassword123" },
      });
      await login(req2.req, req2.res, () => {});

      assert.strictEqual(req1.res.statusCode, 401);
      assert.strictEqual(req2.res.statusCode, 401);
      assert.deepStrictEqual(req1.res._body, req2.res._body);
      assert.strictEqual(req1.res._body.message, "Invalid email or password");
    });

    it("should issue a valid signed JWT with correct payload and expiration on successful login", async () => {
      const plaintextPassword = "CorrectPassword123!";
      const hashedPassword = await bcrypt.hash(plaintextPassword, 10);
      mock.method(User, "findOne", async () => {
        return {
          _id: USER_1_ID,
          name: "Test User",
          email: "user@example.com",
          password: hashedPassword,
          role: "User",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const { req, res } = createMockReqRes({
        method: "POST",
        body: { email: "user@example.com", password: plaintextPassword },
      });

      await login(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res._body.token, "Login response must include a token");

      // Verify token
      const decoded = jwt.verify(res._body.token, TEST_JWT_SECRET);
      assert.strictEqual(decoded.id, USER_1_ID);
      assert.strictEqual(decoded.role, "User");
      assert.ok(decoded.exp > decoded.iat, "Token must have future expiration");

      // Verify sanitized user payload
      assert.strictEqual(res._body.user.password, undefined);
      assert.strictEqual(res._body.user.id, USER_1_ID);
      assert.strictEqual(res._body.user.email, "user@example.com");
      assert.strictEqual(res._body.user.role, "User");
    });
  });
});
