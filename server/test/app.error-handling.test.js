
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("stream");
const app = require("../src/app");

function dispatchRequest(options = {}, body = "") {
  return new Promise((resolve) => {
    const req = Readable.from(body ? [Buffer.from(body)] : []);
    req.method = options.method || "GET";
    req.url = options.url || "/";
    req.headers = {
      ...(options.headers || {}),
      ...(body ? { "content-length": Buffer.byteLength(body).toString() } : {}),
    };

    const resHeaders = {};
    let resData = "";

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        resHeaders[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.setHeader("content-type", "application/json");
        this.end(JSON.stringify(data));
      },
      send(data) {
        this.end(data);
      },
      end(chunk) {
        if (chunk) resData += chunk;
        let parsed = null;
        try {
          parsed = JSON.parse(resData);
        } catch {
          parsed = resData;
        }
        resolve({
          status: this.statusCode,
          headers: resHeaders,
          body: parsed,
          rawBody: resData,
        });
      },
    };

    app.handle(req, res);
  });
}

describe("App - Global Error Handling & Routing", () => {
  it("returns JSON 404 for non-existent routes", async () => {
    const res = await dispatchRequest({ method: "GET", url: "/api/non-existent-route" });
    assert.equal(res.status, 404);
    assert.equal(res.body?.error?.code, "NOT_FOUND");
    assert.equal(res.body?.error?.message, "Route not found");
  });

  it("returns JSON 400 with VALIDATION_ERROR for malformed JSON request bodies", async () => {
    const res = await dispatchRequest(
      {
        method: "POST",
        url: "/api/auth/login",
        headers: { "content-type": "application/json" },
      },
      '{"invalidJson": unquoted_value'
    );

    assert.equal(res.status, 400);
    assert.equal(res.body?.error?.code, "VALIDATION_ERROR");
    assert.match(res.body?.error?.message, /invalid json/i);
    assert.match(res.headers["content-type"], /application\/json/);
  });

  it("handles CORS headers for allowed origins", async () => {
    const res = await dispatchRequest({
      method: "GET",
      url: "/api/health",
      headers: { origin: "http://localhost:5173" },
    });

    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
    assert.equal(res.headers["access-control-allow-credentials"], "true");
  });

  it("handles CORS for 127.0.0.1 development origins", async () => {
    const res = await dispatchRequest({
      method: "GET",
      url: "/api/health",
      headers: { origin: "http://127.0.0.1:5173" },
    });

    assert.equal(res.headers["access-control-allow-origin"], "http://127.0.0.1:5173");
  });

  it("omits CORS origin header for untrusted cross-origin requests", async () => {
    const res = await dispatchRequest({
      method: "GET",
      url: "/api/health",
      headers: { origin: "https://evil-untrusted-site.com" },
    });

    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });
});
