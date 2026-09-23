// results.verifyToken against a replaced fetch serving the JWKS: spec/02-api.md 2.3,
// 2.8 and the JWKS caching rule of 2.11 with its 60 s refetch floor (D78). The floor
// tests move Date with the mock timers of node:test, so none of them waits.
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { describe, it } from "node:test";
import { ApiError, VerificationError, Zakadi } from "@zakadi/node";
import {
  fakeFetch,
  problem,
  resultClaims,
  signToken,
  signingKey,
} from "../helpers.js";

const k1 = signingKey("k1");
const k2 = signingKey("k2");
const jwks = (...keys) => Response.json({ keys: keys.map((key) => key.jwk) });
const client = () => new Zakadi({ apiKey: "zk_test_key" });

describe("results.verifyToken", () => {
  it("resolves to the claims only of an unexpired ES256 JWS signed by a JWKS key", async (t) => {
    const calls = fakeFetch(t, () => jwks(k1));
    const claims = resultClaims();
    assert.deepEqual(
      await client().results.verifyToken(signToken(k1, claims)),
      claims,
    );
    assert.equal(
      calls[0].url.href,
      "https://api.zakadi.dev/.well-known/jwks.json",
    );
    assert.equal(calls[0].headers.get("authorization"), null);
  });

  it("fetches the JWKS once for every token it can verify", async (t) => {
    const calls = fakeFetch(t, () => jwks(k1));
    const zakadi = client();
    await zakadi.results.verifyToken(signToken(k1, resultClaims()));
    await zakadi.results.verifyToken(signToken(k1, resultClaims(60)));
    await Promise.all([
      zakadi.results.verifyToken(signToken(k1, resultClaims())),
      zakadi.results.verifyToken(signToken(k1, resultClaims())),
    ]);
    assert.equal(calls.length, 1);
  });

  it("fetches the JWKS again when a token names an unknown kid 60 s after the last request", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const calls = fakeFetch(t, (_, n) => (n === 1 ? jwks(k1) : jwks(k1, k2)));
    const zakadi = client();
    await zakadi.results.verifyToken(signToken(k1, resultClaims()));
    t.mock.timers.tick(60_000);
    const claims = resultClaims();
    assert.deepEqual(
      await zakadi.results.verifyToken(signToken(k2, claims)),
      claims,
    );
    await zakadi.results.verifyToken(signToken(k2, resultClaims()));
    assert.equal(calls.length, 2);
  });

  it("throws VerificationError when the kid is still unknown after the refetch", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const calls = fakeFetch(t, () => jwks(k1));
    const zakadi = client();
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k2, resultClaims())),
      VerificationError,
    );
    assert.equal(calls.length, 1);
    t.mock.timers.tick(60_000);
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k2, resultClaims())),
      VerificationError,
    );
    assert.equal(calls.length, 2);
  });

  it("throws VerificationError without a request on an unknown kid within 60 s of the last JWKS request", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const calls = fakeFetch(t, (_, n) => (n === 1 ? jwks(k1) : jwks(k1, k2)));
    const zakadi = client();
    await zakadi.results.verifyToken(signToken(k1, resultClaims()));
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k2, resultClaims())),
      VerificationError,
    );
    t.mock.timers.tick(59_999);
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k2, resultClaims())),
      VerificationError,
    );
    assert.equal(calls.length, 1);
    t.mock.timers.tick(1);
    const claims = resultClaims();
    assert.deepEqual(
      await zakadi.results.verifyToken(signToken(k2, claims)),
      claims,
    );
    assert.equal(calls.length, 2);
    await assert.rejects(
      zakadi.results.verifyToken(signToken(signingKey("k3"), resultClaims())),
      VerificationError,
    );
    assert.equal(calls.length, 2);
  });

  it("shares one JWKS request between concurrent verifications, for the first fetch and for a refetch", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const k3 = signingKey("k3");
    const calls = fakeFetch(t, (_, n) =>
      n === 1 ? jwks(k1) : jwks(k1, k2, k3),
    );
    const zakadi = client();
    const verify = (key) =>
      zakadi.results.verifyToken(signToken(key, resultClaims()));
    const first = await Promise.allSettled([
      verify(k1),
      verify(k2),
      verify(k1),
    ]);
    assert.deepEqual(
      first.map((outcome) => outcome.status),
      ["fulfilled", "rejected", "fulfilled"],
    );
    assert.ok(first[1].reason instanceof VerificationError);
    assert.equal(calls.length, 1);
    t.mock.timers.tick(60_000);
    await Promise.all([verify(k2), verify(k3), verify(k2), verify(k1)]);
    assert.equal(calls.length, 2);
  });

  it("throws VerificationError on an expired token or one without exp", async (t) => {
    fakeFetch(t, () => jwks(k1));
    const zakadi = client();
    const expired = {
      ...resultClaims(),
      exp: Math.floor(Date.now() / 1000) - 1,
    };
    const noExp = { ...resultClaims() };
    delete noExp.exp;
    for (const claims of [expired, noExp, { ...noExp, exp: "never" }]) {
      await assert.rejects(
        zakadi.results.verifyToken(signToken(k1, claims)),
        VerificationError,
      );
    }
  });

  it("throws VerificationError on any alg but ES256", async (t) => {
    fakeFetch(t, () => jwks(k1));
    const zakadi = client();
    for (const alg of ["none", "HS256", "RS256", "ES384", undefined]) {
      await assert.rejects(
        zakadi.results.verifyToken(signToken(k1, resultClaims(), { alg })),
        VerificationError,
      );
    }
    await assert.rejects(
      zakadi.results.verifyToken(
        signToken(k1, resultClaims(), { crit: ["x"] }),
      ),
      VerificationError,
    );
  });

  it("throws VerificationError on changed claims or another key's signature", async (t) => {
    fakeFetch(t, () => jwks(k1));
    const zakadi = client();
    const failed = { ...resultClaims(), decision: "fail", band: "C" };
    const [header, , signature] = signToken(k1, failed).split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...failed, decision: "pass", band: "A" }),
    ).toString("base64url");
    await assert.rejects(
      zakadi.results.verifyToken(`${header}.${forged}.${signature}`),
      VerificationError,
    );
    const impostor = signingKey("k1");
    await assert.rejects(
      zakadi.results.verifyToken(signToken(impostor, resultClaims())),
      VerificationError,
    );
  });

  it("throws VerificationError on a token that is not a compact JWS", async (t) => {
    fakeFetch(t, () => jwks(k1));
    const zakadi = client();
    const valid = signToken(k1, resultClaims());
    for (const token of [
      "",
      "abc",
      "a.b",
      `${valid}.extra`,
      `bm90IGpzb24.${valid.split(".")[1]}.${valid.split(".")[2]}`,
      `${valid.split(".")[0]}.${valid.split(".")[1]}.c2hvcnQ`,
      undefined,
    ]) {
      await assert.rejects(
        zakadi.results.verifyToken(token),
        VerificationError,
      );
    }
  });

  it("throws the ApiError of a failed JWKS fetch and fetches again on the next token", async (t) => {
    const calls = fakeFetch(t, (_, n) =>
      n <= 3
        ? problem(503, "internal_error", { "retry-after": "0" })
        : jwks(k1),
    );
    const zakadi = client();
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k1, resultClaims())),
      ApiError,
    );
    const claims = resultClaims();
    assert.deepEqual(
      await zakadi.results.verifyToken(signToken(k1, claims)),
      claims,
    );
    assert.equal(calls.length, 4);
  });

  it("keeps the cached keys when a refetch fails, and the floor runs from the failed request", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    let reply = () => jwks(k1);
    const calls = fakeFetch(t, () => reply());
    const zakadi = client();
    await zakadi.results.verifyToken(signToken(k1, resultClaims()));
    t.mock.timers.tick(60_000);
    reply = () => problem(503, "internal_error", { "retry-after": "0" });
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k2, resultClaims())),
      { name: "ApiError", status: 503, code: "internal_error" },
    );
    // One JWKS request: the refetch and its two retries of the 503.
    assert.equal(calls.length, 4);
    reply = () => jwks(k1, k2);
    const claims = resultClaims();
    assert.deepEqual(
      await zakadi.results.verifyToken(signToken(k1, claims)),
      claims,
    );
    t.mock.timers.tick(59_999);
    await assert.rejects(
      zakadi.results.verifyToken(signToken(k2, resultClaims())),
      VerificationError,
    );
    assert.equal(calls.length, 4);
    t.mock.timers.tick(1);
    assert.deepEqual(
      await zakadi.results.verifyToken(signToken(k2, claims)),
      claims,
    );
    assert.equal(calls.length, 5);
  });

  it("skips JWKS entries that cannot verify ES256", async (t) => {
    const rsa = { kty: "RSA", kid: "k1", n: "AQAB", e: "AQAB" };
    const wrongCurve = { ...k1.jwk, crv: "P-384" };
    const encryption = { ...k1.jwk, use: "enc" };
    fakeFetch(t, () =>
      Response.json({ keys: [rsa, wrongCurve, encryption, null, "x"] }),
    );
    await assert.rejects(
      client().results.verifyToken(signToken(k1, resultClaims())),
      VerificationError,
    );
  });
});
