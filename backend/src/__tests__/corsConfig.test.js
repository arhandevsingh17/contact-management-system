const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createCorsOptions,
  validateCorsConfig,
} = require("../config/corsConfig");

function checkOrigin(env, origin) {
  return new Promise((resolve, reject) => {
    createCorsOptions(env).origin(origin, (error, allowed) => {
      if (error) return reject(error);
      resolve(allowed);
    });
  });
}

test("CORS allows the exact configured frontend origin", async () => {
  const env = {
    NODE_ENV: "production",
    FRONTEND_ORIGIN: "https://contacts.example.com/",
  };

  assert.equal(
    await checkOrigin(env, "https://contacts.example.com"),
    true
  );
  assert.equal(
    await checkOrigin(env, "https://other.example.com"),
    false
  );
});

test("CORS allows loopback HTTP origins during development only", async () => {
  const devEnv = { NODE_ENV: "development" };
  assert.equal(await checkOrigin(devEnv, "http://localhost:5173"), true);
  assert.equal(await checkOrigin(devEnv, "http://127.0.0.1:4173"), true);
  assert.equal(await checkOrigin(devEnv, "https://attacker.example"), false);

  const prodEnv = {
    NODE_ENV: "production",
    FRONTEND_ORIGIN: "https://contacts.example.com",
  };
  assert.equal(await checkOrigin(prodEnv, "http://localhost:5173"), false);
});

test("CORS allows requests without an Origin header", async () => {
  assert.equal(await checkOrigin({ NODE_ENV: "production" }, undefined), true);
});

test("production startup requires a configured deployed HTTPS frontend hostname", () => {
  assert.throws(
    () => validateCorsConfig({ NODE_ENV: "production" }),
    /FRONTEND_ORIGIN is required in production/
  );
  for (const origin of [
    "http://contacts.example.com",
    "https://localhost:5173",
    "https://127.0.0.1",
    "https://192.0.2.10",
    "https://[::1]",
  ]) {
    assert.throws(
      () => validateCorsConfig({
        NODE_ENV: "production",
        FRONTEND_ORIGIN: origin,
      }),
      /deployed HTTPS hostname/
    );
  }

  assert.deepEqual(
    validateCorsConfig({
      NODE_ENV: "production",
      FRONTEND_ORIGIN: "https://contacts.example.com,https://www.contacts.example.com",
    }),
    ["https://contacts.example.com", "https://www.contacts.example.com"]
  );
});

test("invalid configured origins are rejected", () => {
  assert.throws(
    () => validateCorsConfig({
      NODE_ENV: "development",
      FRONTEND_ORIGIN: "not-a-url",
    }),
    /Invalid FRONTEND_ORIGIN/
  );
});
