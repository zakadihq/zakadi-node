// The client over real HTTP: a fake Zakadi API on node:http for sessions, results and
// the JWKS, and a node:http receiver for a webhook delivery.
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  ApiError,
  ResultPending,
  VerificationError,
  Zakadi,
} from "@zakadi/node";
import {
  SESSION,
  SESSION_REQUEST,
  result,
  resultClaims,
  signToken,
  signingKey,
  webhookBody,
  webhookHeaders,
} from "../helpers.js";
import { problem, startFakeApi } from "./fake-api.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("@zakadi/node against a fake API on node:http", () => {
  let api;
  const client = () =>
    new Zakadi({ apiKey: "zk_test_key", baseUrl: api.baseUrl });

  before(async () => {
    api = await startFakeApi();
  });
  beforeEach(() => {
    api.requests.length = 0;
  });
  after(() => api.close());

  it("creates a session, retrying a 503 and a 429 under one Idempotency-Key", async () => {
    api.reply = (_, n) =>
      n === 1
        ? problem(503, "internal_error")
        : n === 2
          ? problem(429, "rate_limited", { "retry-after": "1" })
          : { status: 201, body: SESSION };
    const started = performance.now();
    assert.deepEqual(await client().sessions.create(SESSION_REQUEST), SESSION);
    assert.ok(performance.now() - started >= 1000);
    assert.equal(api.requests.length, 3);
    for (const request of api.requests) {
      assert.equal(request.method, "POST");
      assert.equal(request.path, "/v1/sessions");
      assert.equal(request.headers.authorization, "Bearer zk_test_key");
      assert.deepEqual(JSON.parse(request.body), SESSION_REQUEST);
    }
    const keys = new Set(api.requests.map((r) => r.headers["idempotency-key"]));
    assert.equal(keys.size, 1);
    assert.match([...keys][0], UUID);
  });

  it("maps a problem body to ApiError and does not retry a 4xx", async () => {
    api.reply = () => problem(422, "idempotency_conflict");
    await assert.rejects(
      client().sessions.create(SESSION_REQUEST, { idempotencyKey: "onb-1" }),
      {
        name: "ApiError",
        status: 422,
        code: "idempotency_conflict",
        detail: "detail of idempotency_conflict",
        requestId: "req_idempotency_conflict",
      },
    );
    assert.equal(api.requests.length, 1);
    assert.equal(api.requests[0].headers["idempotency-key"], "onb-1");
  });

  it("carries Zakadi-Request-Id when a 5xx body is not a problem", async () => {
    api.reply = () => ({
      status: 502,
      headers: { "retry-after": "0", "zakadi-request-id": "req_edge_01" },
      body: "<html>bad gateway</html>",
    });
    await assert.rejects(client().sessions.result("ses_01J8"), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 502);
      assert.equal(error.code, undefined);
      assert.equal(error.requestId, "req_edge_01");
      return true;
    });
    assert.equal(api.requests.length, 3);
  });

  it("throws ResultPending until the verdict exists, then verifies its token", async () => {
    const key = signingKey("k1");
    const claims = resultClaims();
    const body = result(signToken(key, claims));
    let ready = false;
    api.reply = (request) => {
      if (request.path === "/.well-known/jwks.json") {
        return { body: { keys: [key.jwk] } };
      }
      return ready ? { body } : problem(404, "result_pending");
    };
    const zakadi = client();
    await assert.rejects(zakadi.sessions.result("ses_01J8"), (error) => {
      assert.ok(error instanceof ResultPending);
      assert.ok(error instanceof ApiError);
      assert.equal(error.requestId, "req_result_pending");
      return true;
    });
    ready = true;
    const fetched = await zakadi.sessions.result("ses_01J8");
    assert.deepEqual(fetched, body);
    assert.deepEqual(
      await zakadi.results.verifyToken(fetched.result_token),
      claims,
    );
    assert.deepEqual(
      api.requests.map((r) => `${r.method} ${r.path}`),
      [
        "GET /v1/sessions/ses_01J8/result",
        "GET /v1/sessions/ses_01J8/result",
        "GET /.well-known/jwks.json",
      ],
    );
  });

  it("fetches the JWKS once, and again when a token names an unknown kid", async () => {
    const [k1, k2] = [signingKey("k1"), signingKey("k2")];
    let published = [k1];
    api.reply = () => ({ body: { keys: published.map((key) => key.jwk) } });
    const zakadi = client();
    await zakadi.results.verifyToken(signToken(k1, resultClaims()));
    await zakadi.results.verifyToken(signToken(k1, resultClaims()));
    assert.equal(api.requests.length, 1);
    published = [k1, k2];
    await zakadi.results.verifyToken(signToken(k2, resultClaims()));
    assert.equal(api.requests.length, 2);
    await assert.rejects(
      zakadi.results.verifyToken(signToken(signingKey("k3"), resultClaims())),
      VerificationError,
    );
    assert.equal(api.requests.length, 3);
    for (const request of api.requests) {
      assert.equal(request.path, "/.well-known/jwks.json");
      assert.equal(request.headers.authorization, undefined);
    }
  });

  it("verifies a webhook delivered to a node:http receiver", async (t) => {
    const secret = "whsec_0123456789abcdef0123456789abcdef";
    const zakadi = client();
    const receiver = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      try {
        const event = zakadi.webhooks.verify(
          req.headers,
          Buffer.concat(chunks),
          { secret },
        );
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: event.id, type: event.type }));
      } catch (error) {
        res.writeHead(error instanceof VerificationError ? 400 : 500).end();
      }
    });
    await new Promise((resolve) => receiver.listen(0, "127.0.0.1", resolve));
    t.after(() => {
      receiver.closeAllConnections();
      receiver.close();
    });
    const url = `http://127.0.0.1:${receiver.address().port}/liveness/hook`;
    const deliver = (headers, body) =>
      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body,
      });
    const body = webhookBody();
    const delivered = await deliver(webhookHeaders(secret, body), body);
    assert.equal(delivered.status, 200);
    assert.deepEqual(await delivered.json(), {
      id: "evt_01J8",
      type: "zakadi.session.completed",
    });
    const tampered = body.replace('"pass"', '"fail"');
    assert.equal(
      (await deliver(webhookHeaders(secret, body), tampered)).status,
      400,
    );
    const old = { timestamp: Math.floor(Date.now() / 1000) - 301 };
    assert.equal(
      (await deliver(webhookHeaders(secret, body, old), body)).status,
      400,
    );
  });
});
