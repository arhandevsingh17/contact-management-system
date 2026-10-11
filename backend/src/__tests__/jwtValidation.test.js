const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const {
  TEST_JWT_SECRET,
  USER_1_ID,
  ADMIN_ID,
  generateToken,
  createMockReqRes,
} = require("./testHelper");

describe("JWT Validation and Authentication Middleware", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    mock.reset();
  });

  describe("Authorization Header Validation", () => {
    it("should return 401 when Authorization header is missing", () => {
      const { req, res } = createMockReqRes({ headers: {} });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authorization token required" });
    });

    it("should return 401 when Authorization header is not a string", () => {
      const { req, res } = createMockReqRes({ headers: { authorization: 12345 } });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authorization token required" });
    });

    it("should return 401 when header uses scheme other than Bearer (e.g. Basic)", () => {
      const { req, res } = createMockReqRes({
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authorization header malformed" });
    });

    it("should return 401 when header contains Bearer without a token", () => {
      const { req, res } = createMockReqRes({
        headers: { authorization: "Bearer" },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authorization header malformed" });
    });

    it("should return 401 when header contains extra parts after the token", () => {
      const token = generateToken();
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token} extra_data` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Authorization header malformed" });
    });
  });

  describe("Server Configuration Fail-Safe", () => {
    it("should pass 500 error to next handler when JWT_SECRET is unset", () => {
      delete process.env.JWT_SECRET;
      const { req, res } = createMockReqRes({
        headers: { authorization: "Bearer some_dummy_token" },
      });

      let passedError = null;
      authMiddleware(req, res, (err) => {
        passedError = err;
      });

      assert.notStrictEqual(passedError, null);
      assert.strictEqual(passedError.status, 500);
      assert.strictEqual(passedError.message, "JWT secret is not configured on the server");
    });

    it("should pass 500 error to next handler when JWT_SECRET is blank or whitespace", () => {
      process.env.JWT_SECRET = "   ";
      const { req, res } = createMockReqRes({
        headers: { authorization: "Bearer some_dummy_token" },
      });

      let passedError = null;
      authMiddleware(req, res, (err) => {
        passedError = err;
      });

      assert.notStrictEqual(passedError, null);
      assert.strictEqual(passedError.status, 500);
      assert.strictEqual(passedError.message, "JWT secret is not configured on the server");
    });
  });

  describe("Token Verification and Signature Validation", () => {
    it("should return 401 when token has an invalid signature (signed with different secret)", () => {
      const token = jwt.sign(
        { id: USER_1_ID, role: "User" },
        "wrong-secret-key-1234567890",
        { expiresIn: "1h" }
      );
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token" });
    });

    it("should return 401 when token is structurally malformed (JsonWebTokenError)", () => {
      const token = "not.a.valid.jwt.structure";
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token" });
    });

    it("should return 401 when jwt.verify throws a SyntaxError (directly exercising SyntaxError error branch)", (t) => {
      t.mock.method(jwt, "verify", () => {
        throw new SyntaxError("Unexpected token in JSON at position 0");
      });

      const { req, res } = createMockReqRes({
        headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature" },
      });
      let nextCalled = false;
      let passedError = null;

      authMiddleware(req, res, (err) => {
        nextCalled = true;
        passedError = err;
      });

      assert.strictEqual(nextCalled, false, "next(err) must not be called when SyntaxError is caught");
      assert.strictEqual(passedError, null);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token" });
    });

    it("should return 401 when token with typ: 'JWT' has a non-JSON payload (natural SyntaxError from jsonwebtoken)", () => {
      // jsonwebtoken (via jws) only attempts JSON.parse on payload when header.typ === 'JWT'.
      // Construct a token with a valid HS256 signature, typ: 'JWT', and an unparseable JSON payload.
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const unparseablePayload = Buffer.from("not-valid-json{").toString("base64url");
      const signingInput = `${header}.${unparseablePayload}`;
      const validSignature = crypto
        .createHmac("sha256", TEST_JWT_SECRET)
        .update(signingInput)
        .digest("base64url");
      const token = `${signingInput}.${validSignature}`;

      // Verify that jsonwebtoken naturally throws a native SyntaxError for this exact token
      assert.throws(
        () => jwt.verify(token, TEST_JWT_SECRET),
        (err) => err instanceof SyntaxError
      );

      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;
      let passedError = null;

      authMiddleware(req, res, (err) => {
        nextCalled = true;
        passedError = err;
      });

      assert.strictEqual(nextCalled, false, "authMiddleware must handle SyntaxError internally without delegating to next(err)");
      assert.strictEqual(passedError, null);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token" });
    });

    it("should return 401 when token has expired", () => {
      const expiredToken = jwt.sign(
        { id: USER_1_ID, role: "User" },
        TEST_JWT_SECRET,
        { expiresIn: "-1s" }
      );
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Token has expired" });
    });
  });

  describe("Token Payload and Identity Verification", () => {
    it("should return 401 when payload id is not a valid 24-character hexadecimal ObjectId", () => {
      const token = jwt.sign(
        { id: "not-a-valid-hex-object-id", role: "User" },
        TEST_JWT_SECRET
      );
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token payload" });
    });

    it("should return 401 when payload id is missing or non-string", () => {
      const token = jwt.sign(
        { id: 12345, role: "User" },
        TEST_JWT_SECRET
      );
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token payload" });
    });

    it("should return 401 when payload role is not in ALLOWED_ROLES (e.g. SuperAdmin or Guest)", () => {
      const token = jwt.sign(
        { id: USER_1_ID, role: "SuperAdmin" },
        TEST_JWT_SECRET
      );
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.deepStrictEqual(res._body, { message: "Invalid token payload" });
    });

    it("should accept valid token for User role and attach req.user { id, role }", () => {
      const token = generateToken({ id: USER_1_ID, role: "User" });
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.notStrictEqual(req.user, undefined);
      assert.strictEqual(req.user.id, USER_1_ID);
      assert.strictEqual(req.user.role, "User");
    });

    it("should accept valid token for Admin role and attach req.user { id, role }", () => {
      const token = generateToken({ id: ADMIN_ID, role: "Admin" });
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.notStrictEqual(req.user, undefined);
      assert.strictEqual(req.user.id, ADMIN_ID);
      assert.strictEqual(req.user.role, "Admin");
    });

    it("should overwrite any client-spoofed req.user with decoded identity", () => {
      const token = generateToken({ id: USER_1_ID, role: "User" });
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
        user: { id: "attacker_spoofed_id", role: "Admin" },
      });
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.id, USER_1_ID);
      assert.strictEqual(req.user.role, "User");
    });
  });
});
