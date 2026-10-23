
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../src/config/env");
const authenticateToken = require("../src/middleware/auth.middleware");

const testSecret = JWT_SECRET || process.env.JWT_SECRET || "test-jwt-secret-flowforge";

function createMockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe("Auth Middleware - Claim & Token Verification", () => {
  it("rejects requests missing the authorization header", () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, "UNAUTHORIZED");
    assert.equal(nextCalled, false);
  });

  it("rejects non-Bearer authorization schemes", () => {
    const req = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, "UNAUTHORIZED");
    assert.equal(nextCalled, false);
  });

  it("rejects empty Bearer token", () => {
    const req = { headers: { authorization: "Bearer " } };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, "UNAUTHORIZED");
    assert.equal(nextCalled, false);
  });

  it("rejects invalid or tampered tokens", () => {
    const req = { headers: { authorization: "Bearer invalid.token.payload" } };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, "INVALID_TOKEN");
    assert.equal(nextCalled, false);
  });

  it("CRITICAL: rejects validly signed tokens that omit the sub (user ID) claim", () => {
    // Token signed with legitimate secret, but no sub claim
    const tokenWithoutSub = jwt.sign({ role: "admin" }, testSecret, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${tokenWithoutSub}` } };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, "INVALID_TOKEN");
    assert.match(res.body?.error?.message, /invalid or malformed/i);
    assert.equal(nextCalled, false);
    assert.equal(req.user, undefined);
  });

  it("CRITICAL: rejects tokens where sub claim is empty string or non-string", () => {
    const tokenEmptySub = jwt.sign({ sub: "   " }, testSecret, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${tokenEmptySub}` } };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, "INVALID_TOKEN");
    assert.equal(nextCalled, false);
  });

  it("accepts validly signed token with a valid sub claim and attaches req.user.id", () => {
    const validToken = jwt.sign({ sub: "usr_test_123" }, testSecret, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, null);
    assert.equal(nextCalled, true);
    assert.equal(req.user?.id, "usr_test_123");
  });
});
