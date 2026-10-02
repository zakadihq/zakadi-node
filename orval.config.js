// orval 8.38.0: npm run generate writes src/generated/ from openapi/openapi.yaml, the
// copy of zakadi-server's api/openapi.yaml that scripts/fetch-openapi.sh pins
// (spec/02-api.md 2.11 and 2.12, D84, D133). api.ts holds a fetch function per
// operation and api.schemas.ts a type per schema. Each function returns its success
// body and sends its request through send, the mutator of src/transport.ts, so the
// API key, the retries and the problem errors of the transport apply to it.
export default {
  zakadi: {
    input: { target: "./openapi/openapi.yaml" },
    output: {
      target: "./src/generated/api.ts",
      client: "fetch",
      mode: "split",
      clean: true,
      // Path parameters are percent-encoded; header parameters, such as
      // Idempotency-Key, are arguments.
      urlEncodeParameters: true,
      headers: true,
      formatter: "prettier",
      override: {
        // No banner: it would carry orval's version and a non-ASCII character.
        header: false,
        fetch: { includeHttpResponseReturnType: false },
        mutator: { path: "./src/transport.ts", name: "send" },
      },
    },
  },
};
