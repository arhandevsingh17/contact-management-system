const { Readable } = require("stream");
const http = require("http");
const jwt = require("jsonwebtoken");

const TEST_JWT_SECRET = "test_super_secret_jwt_key_which_is_long_and_secure_123456789";

const USER_1_ID = "507f1f77bcf86cd799439011";
const USER_2_ID = "507f191e810c19729de860ea";
const ADMIN_ID = "507f191e810c19729de860eb";

const CONTACT_1_ID = "507f191e810c19729de860aa";
const CONTACT_2_ID = "507f191e810c19729de860bb";

/**
 * Generate a signed JWT token for testing.
 */
function generateToken({
  id = USER_1_ID,
  role = "User",
  secret = TEST_JWT_SECRET,
  expiresIn = "1h",
} = {}) {
  return jwt.sign({ id, role }, secret, { expiresIn });
}

/**
 * Lightweight mock request and response objects for unit testing middleware and controllers.
 */
function createMockReqRes({
  method = "GET",
  url = "/",
  headers = {},
  body = null,
  params = {},
  query = {},
  user = undefined,
} = {}) {
  const req = {
    method,
    url,
    headers: { ...headers },
    body,
    params: { ...params },
    query: { ...query },
    user,
  };

  const res = {
    statusCode: 200,
    headersSent: false,
    _headers: {},
    _body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this._body = data;
      this.headersSent = true;
      return this;
    },
    send(data) {
      this._body = data;
      this.headersSent = true;
      return this;
    },
    setHeader(name, val) {
      this._headers[name.toLowerCase()] = val;
      return this;
    },
    getHeader(name) {
      return this._headers[name.toLowerCase()];
    },
  };

  return { req, res };
}

/**
 * Perform an in-memory HTTP request against an Express app using Node standard streams.
 * Does not require opening network ports or sockets.
 */
function makeRequest(app, { method = "GET", url = "/", headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const reqHeaders = { ...headers };

    if (body !== null && body !== undefined) {
      payload = typeof body === "string" ? body : JSON.stringify(body);
      if (!reqHeaders["content-type"]) {
        reqHeaders["content-type"] = "application/json";
      }
      reqHeaders["content-length"] = String(Buffer.byteLength(payload));
    }

    const req = new Readable({
      read() {
        if (payload !== null) {
          this.push(payload);
          payload = null;
        } else {
          this.push(null);
        }
      },
    });

    req.method = method;
    req.url = url;
    req.headers = reqHeaders;

    const res = new http.ServerResponse(req);
    let resBody = "";

    res.write = function (chunk) {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) resBody += chunk.toString();
      let parsed = resBody;
      try {
        parsed = JSON.parse(resBody);
      } catch (_) {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsed,
        rawBody: resBody,
      });
    };

    try {
      app.handle(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  TEST_JWT_SECRET,
  USER_1_ID,
  USER_2_ID,
  ADMIN_ID,
  CONTACT_1_ID,
  CONTACT_2_ID,
  generateToken,
  createMockReqRes,
  makeRequest,
};
