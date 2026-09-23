// webhooks.verify: the signature and timestamp rules of spec/02-api.md 2.4. No I/O.
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import { describe, it } from "node:test";
import { VerificationError, Zakadi } from "@zakadi/node";
import { webhookBody, webhookHeaders } from "../helpers.js";

const secret = "whsec_0123456789abcdef0123456789abcdef";
const body = webhookBody();
const { webhooks } = new Zakadi({ apiKey: "zk_test_key" });
const now = () => Math.floor(Date.now() / 1000);

describe("webhooks.verify", () => {
  it("returns the event of a delivery signed as 2.4 specifies", () => {
    const event = webhooks.verify(webhookHeaders(secret, body), body, {
      secret,
    });
    assert.deepEqual(event, JSON.parse(body));
    assert.equal(event.id, "evt_01J8");
  });

  it("accepts a Buffer body, a Headers instance and any header case", () => {
    const headers = webhookHeaders(secret, body);
    const shouted = Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [
        name.replace(/(^|-)([a-z])/g, (m) => m.toUpperCase()),
        value,
      ]),
    );
    const raw = Buffer.from(body);
    for (const given of [new Headers(headers), shouted]) {
      assert.deepEqual(
        webhooks.verify(given, raw, { secret }),
        JSON.parse(body),
      );
    }
    assert.deepEqual(
      webhooks.verify(headers, new Uint8Array(raw), { secret }),
      JSON.parse(body),
    );
  });

  it("accepts a timestamp 300 s old and refuses one 301 s old", () => {
    const at = (timestamp) =>
      webhookHeaders(secret, body, { timestamp: String(timestamp) });
    assert.ok(webhooks.verify(at(now() - 300), body, { secret }));
    assert.throws(
      () => webhooks.verify(at(now() - 301), body, { secret }),
      VerificationError,
    );
  });

  it("throws VerificationError on another secret, body, id or timestamp", () => {
    const headers = webhookHeaders(secret, body);
    const cases = [
      [headers, body, "whsec_another_secret_of_32_bytes_xx"],
      [headers, body.replace('"pass"', '"fail"'), secret],
      [{ ...headers, "zakadi-webhook-id": "evt_other" }, body, secret],
      [
        {
          ...headers,
          "zakadi-webhook-timestamp": String(
            Number(headers["zakadi-webhook-timestamp"]) + 1,
          ),
        },
        body,
        secret,
      ],
    ];
    for (const [given, raw, key] of cases) {
      assert.throws(
        () => webhooks.verify(given, raw, { secret: key }),
        VerificationError,
      );
    }
  });

  it("throws VerificationError on a missing or malformed header", () => {
    const headers = webhookHeaders(secret, body);
    const mac = headers["zakadi-webhook-signature"].slice(3);
    const variants = [
      { "zakadi-webhook-id": undefined },
      { "zakadi-webhook-timestamp": undefined },
      { "zakadi-webhook-signature": undefined },
      { "zakadi-webhook-timestamp": "1e9" },
      { "zakadi-webhook-signature": mac },
      { "zakadi-webhook-signature": `v2=${mac}` },
      { "zakadi-webhook-signature": `v1=${mac.slice(2)}` },
      { "zakadi-webhook-signature": `v1=${mac}00` },
    ];
    for (const variant of variants) {
      assert.throws(
        () => webhooks.verify({ ...headers, ...variant }, body, { secret }),
        VerificationError,
      );
    }
  });

  it("compares the signature with crypto.timingSafeEqual", (t) => {
    const spy = t.mock.method(crypto, "timingSafeEqual");
    syncBuiltinESMExports();
    t.after(() => {
      spy.mock.restore();
      syncBuiltinESMExports();
    });
    webhooks.verify(webhookHeaders(secret, body), body, { secret });
    assert.equal(spy.mock.callCount(), 1);
  });

  it("throws VerificationError when the signed body is not JSON", () => {
    const text = "not json";
    assert.throws(
      () => webhooks.verify(webhookHeaders(secret, text), text, { secret }),
      VerificationError,
    );
  });

  it("refuses to verify with an empty secret", () => {
    assert.throws(
      () => webhooks.verify(webhookHeaders("", body), body, { secret: "" }),
      TypeError,
    );
  });
});
