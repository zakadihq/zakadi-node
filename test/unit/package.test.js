// The package surface: the manifest, the import and require entries, the client shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import {
  ApiError,
  ResultPending,
  VerificationError,
  Zakadi,
} from "@zakadi/node";

const manifest = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
);

test("package.json names @zakadi/node, Node 20 and later, Apache-2.0, no dependencies", () => {
  assert.equal(manifest.name, "@zakadi/node");
  assert.equal(manifest.engines.node, ">=20");
  assert.equal(manifest.license, "Apache-2.0");
  assert.equal(manifest.dependencies, undefined);
});

test("require() of @zakadi/node gives the module that import gives", () => {
  const required = createRequire(import.meta.url)("@zakadi/node");
  assert.equal(required.Zakadi, Zakadi);
  assert.equal(required.ApiError, ApiError);
});

test("new Zakadi({apiKey, baseUrl}) exposes sessions, results and webhooks", () => {
  const client = new Zakadi({
    apiKey: "zk_test_key",
    baseUrl: "https://api.zakadi.dev",
  });
  assert.equal(typeof client.sessions.create, "function");
  assert.equal(typeof client.sessions.result, "function");
  assert.equal(typeof client.results.verifyToken, "function");
  assert.equal(typeof client.webhooks.verify, "function");
});

test("the API key is not an enumerable property of the client", () => {
  const client = new Zakadi({ apiKey: "zk_test_secretkey" });
  assert.doesNotMatch(JSON.stringify(client), /zk_test_secretkey/);
  assert.doesNotMatch(
    Object.values(client)
      .map((part) => JSON.stringify(part))
      .join(),
    /zk_test_secretkey/,
  );
});

test("a missing apiKey is refused", () => {
  assert.throws(() => new Zakadi({ apiKey: "" }), TypeError);
  assert.throws(() => new Zakadi({}), TypeError);
});

test("ResultPending is an ApiError; VerificationError is not", () => {
  const pending = new ResultPending(404, { code: "result_pending" });
  assert.ok(pending instanceof ApiError);
  assert.equal(pending.name, "ResultPending");
  assert.ok(!(new VerificationError("x") instanceof ApiError));
});
