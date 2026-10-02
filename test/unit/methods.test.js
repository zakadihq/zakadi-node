// The methods over the generated functions against a replaced fetch: each sends its
// operation's method, path, query, body and API key (spec/02-api.md 2.1 to 2.5 and 2.7)
// and resolves to the body; only the idempotent ones retry a 429 or 5xx (2.11).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, ResultPending, Zakadi } from "@zakadi/node";
import {
  DELIVERIES,
  EVIDENCE,
  JOB,
  POLICY,
  POLICY_SETTINGS,
  SESSION_STATUS,
  USAGE,
  WEBHOOK,
  WEBHOOK_CREATE,
  WEBHOOK_UPDATE,
  fakeFetch,
  problem,
} from "../helpers.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const client = () => new Zakadi({ apiKey: "zk_test_key" });
/** An id with every character a path segment must encode. */
const ID = "x/../y?z#w";
const ENCODED = "x%2F..%2Fy%3Fz%23w";

/**
 * Each method of the ticket's table: the call, the request it must send, the 2xx it is
 * answered with (`reply` absent for a bodiless 202 or 204) and whether it is retried.
 */
const METHODS = [
  {
    name: "sessions.get",
    call: (zakadi) => zakadi.sessions.get(ID),
    method: "GET",
    path: `/v1/sessions/${ENCODED}`,
    reply: SESSION_STATUS,
    retried: true,
  },
  {
    name: "sessions.list",
    call: (zakadi) =>
      zakadi.sessions.list({
        user_ref: "cust-88213",
        status: "passed",
        from: "2026-09-22T00:00:00Z",
        to: "2026-09-23T00:00:00Z",
        cursor: "c2VzXzAx",
        limit: 50,
      }),
    method: "GET",
    path: "/v1/sessions",
    query: {
      user_ref: "cust-88213",
      status: "passed",
      from: "2026-09-22T00:00:00Z",
      to: "2026-09-23T00:00:00Z",
      cursor: "c2VzXzAx",
      limit: "50",
    },
    reply: { data: [SESSION_STATUS], next_cursor: "c2VzXzAy" },
    retried: true,
  },
  {
    name: "sessions.cancel",
    call: (zakadi) => zakadi.sessions.cancel(ID),
    method: "POST",
    path: `/v1/sessions/${ENCODED}/cancel`,
    reply: { ...SESSION_STATUS, status: "aborted", verdict_at: null },
    retried: false,
  },
  {
    name: "sessions.evidence",
    call: (zakadi) => zakadi.sessions.evidence(ID),
    method: "GET",
    path: `/v1/sessions/${ENCODED}/evidence`,
    reply: EVIDENCE,
    retried: true,
  },
  {
    name: "sessions.purge",
    call: (zakadi) => zakadi.sessions.purge(ID),
    method: "DELETE",
    path: `/v1/sessions/${ENCODED}`,
    status: 202,
    retried: true,
  },
  {
    name: "subjects.purge",
    call: (zakadi) => zakadi.subjects.purge({ user_ref: "cust-88213" }),
    method: "POST",
    path: "/v1/subjects/purge",
    body: { user_ref: "cust-88213" },
    status: 202,
    reply: JOB,
    retried: false,
  },
  {
    name: "jobs.get",
    call: (zakadi) => zakadi.jobs.get(ID),
    method: "GET",
    path: `/v1/jobs/${ENCODED}`,
    reply: {
      ...JOB,
      status: "succeeded",
      completed_at: "2026-09-22T13:00:41Z",
    },
    retried: true,
  },
  {
    name: "webhooks.create",
    call: (zakadi) =>
      zakadi.webhooks.create(WEBHOOK_CREATE, { idempotencyKey: "wh-88213-1" }),
    method: "POST",
    path: "/v1/webhooks",
    body: WEBHOOK_CREATE,
    headers: { "idempotency-key": "wh-88213-1" },
    status: 201,
    reply: WEBHOOK,
    retried: true,
  },
  {
    name: "webhooks.list",
    call: (zakadi) => zakadi.webhooks.list(),
    method: "GET",
    path: "/v1/webhooks",
    reply: { data: [WEBHOOK] },
    retried: true,
  },
  {
    name: "webhooks.get",
    call: (zakadi) => zakadi.webhooks.get(ID),
    method: "GET",
    path: `/v1/webhooks/${ENCODED}`,
    reply: WEBHOOK,
    retried: true,
  },
  {
    name: "webhooks.update",
    call: (zakadi) => zakadi.webhooks.update(ID, WEBHOOK_UPDATE),
    method: "PUT",
    path: `/v1/webhooks/${ENCODED}`,
    body: WEBHOOK_UPDATE,
    reply: { ...WEBHOOK, ...WEBHOOK_UPDATE },
    retried: true,
  },
  {
    name: "webhooks.delete",
    call: (zakadi) => zakadi.webhooks.delete(ID),
    method: "DELETE",
    path: `/v1/webhooks/${ENCODED}`,
    status: 204,
    retried: true,
  },
  {
    name: "webhooks.deliveries",
    call: (zakadi) =>
      zakadi.webhooks.deliveries(ID, { cursor: "ZXZ0XzAx", limit: 10 }),
    method: "GET",
    path: `/v1/webhooks/${ENCODED}/deliveries`,
    query: { cursor: "ZXZ0XzAx", limit: "10" },
    reply: DELIVERIES,
    retried: true,
  },
  {
    name: "tenants.policy",
    call: (zakadi) => zakadi.tenants.policy(ID),
    method: "GET",
    path: `/v1/tenants/${ENCODED}/policy`,
    reply: POLICY,
    retried: true,
  },
  {
    name: "tenants.updatePolicy",
    call: (zakadi) => zakadi.tenants.updatePolicy(ID, POLICY_SETTINGS),
    method: "PUT",
    path: `/v1/tenants/${ENCODED}/policy`,
    body: POLICY_SETTINGS,
    reply: POLICY,
    retried: true,
  },
  {
    name: "tenants.usage",
    call: (zakadi) =>
      zakadi.tenants.usage(ID, { from: "2026-09-21", to: "2026-09-22" }),
    method: "GET",
    path: `/v1/tenants/${ENCODED}/usage`,
    query: { from: "2026-09-21", to: "2026-09-22" },
    reply: USAGE,
    retried: true,
  },
];

/** The 2xx `method` is answered with: its JSON body, or none for a 202 or 204. */
const answer = ({ reply, status = 200 }) =>
  reply === undefined
    ? new Response(null, { status })
    : Response.json(reply, { status });

/** The parts of a recorded request that a retry repeats unchanged. */
const sent = (call) => ({
  method: call.method,
  href: call.url.href,
  body: call.body,
  authorization: call.headers.get("authorization"),
  idempotencyKey: call.headers.get("idempotency-key"),
});

describe("each method", () => {
  for (const method of METHODS) {
    const resolves =
      method.reply === undefined
        ? `undefined on the bodiless ${method.status}`
        : "the body";
    it(`${method.name} sends ${method.method} ${method.path} with the Bearer key and resolves to ${resolves}`, async (t) => {
      const calls = fakeFetch(t, () => answer(method));
      const resolved = await method.call(client());
      if (method.reply === undefined) {
        assert.equal(resolved, undefined);
      } else {
        assert.deepEqual(resolved, method.reply);
      }
      assert.equal(calls.length, 1);
      const [call] = calls;
      assert.equal(call.method, method.method);
      assert.equal(call.url.origin, "https://api.zakadi.dev");
      assert.equal(call.url.pathname, method.path);
      assert.deepEqual(
        Object.fromEntries(call.url.searchParams),
        method.query ?? {},
      );
      assert.equal(call.headers.get("authorization"), "Bearer zk_test_key");
      if (method.body === undefined) {
        assert.equal(call.body, undefined);
      } else {
        assert.equal(call.headers.get("content-type"), "application/json");
        assert.deepEqual(JSON.parse(call.body), method.body);
      }
      for (const [name, value] of Object.entries(method.headers ?? {})) {
        assert.equal(call.headers.get(name), value);
      }
    });
  }
});

describe("retries", () => {
  for (const method of METHODS.filter((m) => m.retried)) {
    it(`${method.name} retries a 429 and a 5xx with the same request, at most twice`, async (t) => {
      // The first call: a 429, a 503, then the answer; the second: 503 to the end.
      const calls = fakeFetch(t, (_, n) =>
        n === 1
          ? problem(429, "rate_limited", { "retry-after": "0" })
          : n === 3
            ? answer(method)
            : problem(503, "internal_error", { "retry-after": "0" }),
      );
      const zakadi = client();
      assert.deepEqual(await method.call(zakadi), method.reply);
      assert.equal(calls.length, 3);
      for (const call of calls) {
        assert.deepEqual(sent(call), sent(calls[0]));
      }
      await assert.rejects(method.call(zakadi), {
        name: "ApiError",
        status: 503,
        code: "internal_error",
      });
      assert.equal(calls.length, 6);
    });
  }

  for (const method of METHODS.filter((m) => !m.retried)) {
    it(`${method.name} does not retry a 429 or a 5xx`, async (t) => {
      const calls = fakeFetch(t, (_, n) =>
        n === 1
          ? problem(429, "rate_limited", { "retry-after": "0" })
          : problem(503, "internal_error", { "retry-after": "0" }),
      );
      const zakadi = client();
      await assert.rejects(method.call(zakadi), {
        name: "ApiError",
        status: 429,
        code: "rate_limited",
      });
      assert.equal(calls.length, 1);
      await assert.rejects(method.call(zakadi), {
        name: "ApiError",
        status: 503,
        code: "internal_error",
      });
      assert.equal(calls.length, 2);
    });
  }
});

describe("webhooks.create", () => {
  const created = () => Response.json(WEBHOOK, { status: 201 });

  it("keeps the given Idempotency-Key across retries", async (t) => {
    const calls = fakeFetch(t, (_, n) =>
      n < 3
        ? problem(503, "internal_error", { "retry-after": "0" })
        : created(),
    );
    await client().webhooks.create(WEBHOOK_CREATE, { idempotencyKey: "wh-1" });
    assert.deepEqual(
      calls.map((call) => call.headers.get("idempotency-key")),
      ["wh-1", "wh-1", "wh-1"],
    );
  });

  it("generates an Idempotency-Key per call and keeps it across retries", async (t) => {
    const calls = fakeFetch(t, (_, n) =>
      n === 1 || n === 3
        ? problem(429, "rate_limited", { "retry-after": "0" })
        : created(),
    );
    const zakadi = client();
    await zakadi.webhooks.create(WEBHOOK_CREATE);
    await zakadi.webhooks.create(WEBHOOK_CREATE);
    const keys = calls.map((call) => call.headers.get("idempotency-key"));
    assert.equal(keys.length, 4);
    for (const key of keys) {
      assert.match(key, UUID);
    }
    assert.equal(keys[0], keys[1]);
    assert.equal(keys[2], keys[3]);
    assert.notEqual(keys[0], keys[2]);
  });

  it("waits the Retry-After seconds before retrying", async (t) => {
    fakeFetch(t, (_, n) =>
      n === 1
        ? problem(429, "rate_limited", { "retry-after": "1" })
        : created(),
    );
    const started = performance.now();
    await client().webhooks.create(WEBHOOK_CREATE);
    assert.ok(performance.now() - started >= 990);
  });
});

describe("problem answers", () => {
  for (const [name, call, status, code] of [
    ["webhooks.get", (z) => z.webhooks.get("wh_x"), 404, "webhook_not_found"],
    [
      "webhooks.delete",
      (z) => z.webhooks.delete("wh_x"),
      404,
      "webhook_not_found",
    ],
    ["jobs.get", (z) => z.jobs.get("job_x"), 404, "job_not_found"],
    ["sessions.get", (z) => z.sessions.get("ses_x"), 404, "session_not_found"],
    [
      "sessions.cancel",
      (z) => z.sessions.cancel("ses_x"),
      409,
      "session_not_cancellable",
    ],
    [
      "tenants.policy",
      (z) => z.tenants.policy("ten_x"),
      403,
      "forbidden_scope",
    ],
  ]) {
    it(`${name} throws ApiError with code and requestId on ${status} ${code}`, async (t) => {
      const calls = fakeFetch(t, () => problem(status, code));
      await assert.rejects(call(client()), (error) => {
        assert.ok(error instanceof ApiError);
        assert.ok(!(error instanceof ResultPending));
        assert.equal(error.status, status);
        assert.equal(error.code, code);
        assert.equal(error.detail, `detail of ${code}`);
        assert.equal(error.requestId, `req_${code}`);
        return true;
      });
      assert.equal(calls.length, 1);
    });
  }

  for (const name of ["evidence", "purge"]) {
    it(`sessions.${name} throws ResultPending on the 404 result_pending`, async (t) => {
      fakeFetch(t, () => problem(404, "result_pending"));
      await assert.rejects(client().sessions[name]("ses_01J8"), (error) => {
        assert.ok(error instanceof ResultPending);
        assert.equal(error.code, "result_pending");
        assert.equal(error.requestId, "req_result_pending");
        return true;
      });
    });
  }
});
