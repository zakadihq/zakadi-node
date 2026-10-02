// The types of @zakadi/node as a TypeScript consumer compiles them against dist/: the
// bodies D71 names are the generated ones (D84), and models names every schema of
// openapi/openapi.yaml. Each source is compiled in memory as a module of this package.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = new URL("../../", import.meta.url);
const consumer = fileURLToPath(new URL("test/unit/consumer.ts", root));
const options = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2023.d.ts"],
  types: ["node"],
  strict: true,
  exactOptionalPropertyTypes: true,
  noEmit: true,
};

/** The component schema names: the keys four spaces in, after `  schemas:`. */
async function schemaNames() {
  const yaml = await readFile(new URL("openapi/openapi.yaml", root), "utf8");
  const schemas = yaml.slice(yaml.indexOf("\n  schemas:\n"));
  return [...schemas.matchAll(/^ {4}([A-Za-z0-9_]+):$/gm)].map(
    (match) => match[1],
  );
}

/** The messages of the errors TypeScript reports for `source`. */
function errors(source) {
  const host = ts.createCompilerHost(options);
  const { fileExists, getSourceFile, readFile: read } = host;
  host.fileExists = (name) => name === consumer || fileExists(name);
  host.readFile = (name) => (name === consumer ? source : read(name));
  host.getSourceFile = (name, version, ...rest) =>
    name === consumer
      ? ts.createSourceFile(name, source, version)
      : getSourceFile(name, version, ...rest);
  const program = ts.createProgram([consumer], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
}

const header = `import type {
  Result,
  Session,
  SessionCreateParams,
  WebhookEvent,
  models,
} from "@zakadi/node";
type Same<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
`;

test("Session, SessionCreateParams, Result and WebhookEvent are the generated SessionCreated, SessionCreate, Result and WebhookEvent", () => {
  const source = `${header}
export const generated: [
  Same<Session, models.SessionCreated>,
  Same<SessionCreateParams, models.SessionCreate>,
  Same<Result, models.Result>,
  Same<WebhookEvent, models.WebhookEvent>,
] = [true, true, true, true];
export const superseded: Pick<Result, "superseded"> = { superseded: true };
export const data: Pick<WebhookEvent["data"], "superseded"> = { superseded: false };
`;
  assert.deepEqual(errors(source), []);
  assert.notDeepEqual(
    errors(
      `${header}export const wrong: Same<Session, models.Session> = true;`,
    ),
    [],
  );
});

test("models exports every schema of openapi/openapi.yaml", async () => {
  const names = await schemaNames();
  assert.ok(names.length >= 75, `${names.length} schemas`);
  const source = `${header}
export type Schemas = [
${names.map((name) => `  models.${name},`).join("\n")}
];
`;
  assert.deepEqual(errors(source), []);
  assert.notDeepEqual(
    errors(`${header}export type Missing = models.NoSuchSchema;`),
    [],
  );
});
