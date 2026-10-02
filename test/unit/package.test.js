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

test("orval 8.38.0 (MIT) is a devDependency pinned exactly, run by npm run generate", async () => {
  const lock = JSON.parse(
    await readFile(new URL("../../package-lock.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.devDependencies.orval, "8.38.0");
  assert.equal(manifest.scripts.generate, "orval");
  const orval = lock.packages["node_modules/orval"];
  assert.equal(orval.version, "8.38.0");
  assert.equal(orval.license, "MIT");
  assert.equal(orval.dev, true);
  // allowScripts approves lefthook's install script and denies every other one the
  // lock carries, esbuild's (orval's) among them (D131).
  const scripted = Object.entries(lock.packages)
    .filter(([, entry]) => entry.hasInstallScript)
    .map(([path]) => path.slice(path.lastIndexOf("node_modules/") + 13));
  assert.deepEqual(scripted.sort(), ["esbuild", "lefthook"]);
  assert.deepEqual(manifest.allowScripts, { lefthook: true, esbuild: false });
});

test("require() of @zakadi/node gives the module that import gives", () => {
  const required = createRequire(import.meta.url)("@zakadi/node");
  assert.equal(required.Zakadi, Zakadi);
  assert.equal(required.ApiError, ApiError);
});

test("new Zakadi({apiKey, baseUrl}) exposes the methods of 2.11 and the generated layer", () => {
  const client = new Zakadi({
    apiKey: "zk_test_key",
    baseUrl: "https://api.zakadi.dev",
  });
  const methods = {
    sessions: [
      "create",
      "get",
      "list",
      "cancel",
      "result",
      "evidence",
      "purge",
    ],
    subjects: ["purge"],
    jobs: ["get"],
    webhooks: [
      "create",
      "list",
      "get",
      "update",
      "delete",
      "deliveries",
      "verify",
    ],
    tenants: ["policy", "updatePolicy", "usage"],
    results: ["verifyToken"],
  };
  for (const [group, names] of Object.entries(methods)) {
    for (const name of names) {
      assert.equal(typeof client[group][name], "function", `${group}.${name}`);
    }
  }
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
