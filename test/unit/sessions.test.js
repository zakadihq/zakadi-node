// sessions.create and sessions.result against a replaced fetch: the /v1/ transport rules
// of spec/02-api.md 2.1 and 2.11.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, ResultPending, Zakadi } from "@zakadi/node";
import {
  SESSION,
  SESSION_REQUEST,
  fakeFetch,
  problem,
  result,
} from "../helpers.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const client = () => new Zakadi({ apiKey: "zk_test_key" });
const created = () => Response.json(SESSION, { status: 201 });

describe("sessions.create", () => {
  it("posts to /v1/sessions with the Bearer key and resolves to the 201 body unchanged", async (t) => {
    const calls = fakeFetch(t, created);
    const session = await client().sessions.create(SESSION_REQUEST, {
      idempotencyKey: "onb-88213-1",
    });
    assert.deepEqual(session, SESSION);
    for (const field of ["client_token", "ingest", "prompt_pack", "ui"]) {
      assert.deepEqual(session[field], SESSION[field]);
    }
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.method, "POST");
    assert.equal(call.url.href, "https://api.zakadi.dev/v1/sessions");
    assert.equal(call.headers.get("authorization"), "Bearer zk_test_key");
    assert.equal(call.headers.get("idempotency-key"), "onb-88213-1");
    assert.equal(call.headers.get("content-type"), "application/json");
    assert.deepEqual(JSON.parse(call.body), SESSION_REQUEST);
  });

  it("generates an Idempotency-Key per call when none is supplied", async (t) => {
    const calls = fakeFetch(t, created);
    const zakadi = client();
    await zakadi.sessions.create(SESSION_REQUEST);
    await zakadi.sessions.create(SESSION_REQUEST);
    const [first, second] = calls.map((c) => c.headers.get("idempotency-key"));
    assert.match(first, UUID);
    assert.match(second, UUID);
    assert.notEqual(first, second);
  });

  it("retries 429 and 5xx with the same Idempotency-Key", async (t) => {
    const calls = fakeFetch(t, (_, n) =>
      n === 1
        ? problem(429, "rate_limited", { "retry-after": "0" })
        : n === 2
          ? problem(503, "internal_error", { "retry-after": "0" })
          : created(),
    );
    assert.deepEqual(await client().sessions.create(SESSION_REQUEST), SESSION);
    assert.equal(calls.length, 3);
    const keys = new Set(calls.map((c) => c.headers.get("idempotency-key")));
    assert.equal(keys.size, 1);
    assert.match([...keys][0], UUID);
  });

  for (const [status, code] of [
    [400, "validation_error"],
    [401, "unauthorized"],
    [403, "forbidden_scope"],
    [409, "session_not_cancellable"],
    [422, "idempotency_conflict"],
  ]) {
    it(`does not retry a ${status}`, async (t) => {
      const calls = fakeFetch(t, () => problem(status, code));
      await assert.rejects(client().sessions.create(SESSION_REQUEST), {
        name: "ApiError",
        status,
        code,
      });
      assert.equal(calls.length, 1);
    });
  }

  it("stops after two retries and throws the last ApiError", async (t) => {
    const calls = fakeFetch(t, () =>
      problem(503, "internal_error", { "retry-after": "0" }),
    );
    await assert.rejects(client().sessions.create(SESSION_REQUEST), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 503);
      assert.equal(error.code, "internal_error");
      return true;
    });
    assert.equal(calls.length, 3);
  });

  it("waits the Retry-After seconds before retrying", async (t) => {
    fakeFetch(t, (_, n) =>
      n === 1
        ? problem(429, "rate_limited", { "retry-after": "1" })
        : created(),
    );
    const started = performance.now();
    await client().sessions.create(SESSION_REQUEST);
    assert.ok(performance.now() - started >= 990);
  });

  it("backs off when a 5xx carries no Retry-After", async (t) => {
    fakeFetch(t, (_, n) =>
      n === 1 ? new Response("upstream down", { status: 502 }) : created(),
    );
    const started = performance.now();
    await client().sessions.create(SESSION_REQUEST);
    assert.ok(performance.now() - started >= 240);
  });

  it("throws instead of waiting out a Retry-After above 60 s", async (t) => {
    const calls = fakeFetch(t, () =>
      problem(429, "rate_limited", { "retry-after": "120" }),
    );
    await assert.rejects(client().sessions.create(SESSION_REQUEST), {
      status: 429,
      code: "rate_limited",
    });
    assert.equal(calls.length, 1);
  });

  it("joins paths to baseUrl without its trailing slash", async (t) => {
    const calls = fakeFetch(t, created);
    const zakadi = new Zakadi({
      apiKey: "zk_test_key",
      baseUrl: "http://127.0.0.1:8080/api/",
    });
    await zakadi.sessions.create(SESSION_REQUEST);
    assert.equal(calls[0].url.href, "http://127.0.0.1:8080/api/v1/sessions");
  });
});

describe("sessions.result", () => {
  it("gets /v1/sessions/{id}/result and resolves to the 200 body", async (t) => {
    const body = result("eyJ.eyJ.sig");
    const calls = fakeFetch(t, () => Response.json(body));
    assert.deepEqual(await client().sessions.result("ses_01J8"), body);
    assert.equal(calls[0].method, "GET");
    assert.equal(
      calls[0].url.href,
      "https://api.zakadi.dev/v1/sessions/ses_01J8/result",
    );
    assert.equal(calls[0].headers.get("authorization"), "Bearer zk_test_key");
  });

  it("encodes the session id into the path", async (t) => {
    const calls = fakeFetch(t, () => Response.json(result("t")));
    await client().sessions.result("ses/../x?y");
    assert.equal(calls[0].url.pathname, "/v1/sessions/ses%2F..%2Fx%3Fy/result");
  });

  it("throws ResultPending, an ApiError, on the 404 result_pending", async (t) => {
    const calls = fakeFetch(t, () => problem(404, "result_pending"));
    await assert.rejects(client().sessions.result("ses_01J8"), (error) => {
      assert.ok(error instanceof ResultPending);
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 404);
      assert.equal(error.code, "result_pending");
      assert.equal(error.detail, "detail of result_pending");
      assert.equal(error.requestId, "req_result_pending");
      return true;
    });
    assert.equal(calls.length, 1);
  });

  it("throws a plain ApiError on another 404", async (t) => {
    fakeFetch(t, () => problem(404, "session_not_found"));
    await assert.rejects(client().sessions.result("ses_x"), (error) => {
      assert.ok(error instanceof ApiError);
      assert.ok(!(error instanceof ResultPending));
      assert.equal(error.code, "session_not_found");
      return true;
    });
  });

  it("takes requestId from Zakadi-Request-Id when the body is not a problem", async (t) => {
    fakeFetch(
      t,
      () =>
        new Response("<html>bad gateway</html>", {
          status: 502,
          headers: {
            "content-type": "text/html",
            "retry-after": "0",
            "zakadi-request-id": "req_edge_01",
          },
        }),
    );
    await assert.rejects(client().sessions.result("ses_01J8"), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 502);
      assert.equal(error.code, undefined);
      assert.equal(error.detail, undefined);
      assert.equal(error.requestId, "req_edge_01");
      return true;
    });
  });
});
