# zakadi-node

`@zakadi/node`, the server-side client for the Zakadi API for Node.js 20 and later: session creation, results, result-token verification and webhook signature verification. Specification: `zakadi/spec/02-api.md` section 2.11. The Python twin is `zakadi-python`.

Status: the hand-written layer of section 2.11 (`sessions.create`, `sessions.result`, `results.verifyToken` and `webhooks.verify`). The layer generated from the OpenAPI document, with the other operations of section 2.12 such as evidence, follows when `zakadi-server` publishes `api/openapi.yaml`. Not yet published to npm.

## Usage

```js
import { ResultPending, Zakadi } from "@zakadi/node";

const client = new Zakadi({ apiKey: process.env.ZAKADI_API_KEY });

const session = await client.sessions.create(
  { user_ref: "cust-88213", locale: "en-NG", channel: "android" },
  { idempotencyKey: "onb-88213-1" },
);
// Hand session.client_token, ingest, prompt_pack and ui to the app unchanged.

try {
  const result = await client.sessions.result(session.session_id);
  const claims = await client.results.verifyToken(result.result_token);
} catch (error) {
  if (!(error instanceof ResultPending)) throw error;
  // No verdict yet: poll with backoff, or wait for the webhook.
}

// In the webhook handler, with the body as received (bytes or text, not parsed JSON):
const event = client.webhooks.verify(req.headers, rawBody, {
  secret: process.env.ZAKADI_WEBHOOK_SECRET,
});
```

The package is an ES module; `require("@zakadi/node")` works on the Node.js versions that load ES modules through `require()` (20.19 and later, 22.12 and later).

## Behaviour

- Methods and options are camelCase; request and response bodies keep the API's field names and pass through unchanged.
- `baseUrl` defaults to `https://api.zakadi.dev`. Calls under `/v1/` send `Authorization: Bearer <apiKey>`; the public JWKS is fetched without it.
- A non-2xx response throws `ApiError` with `status`, and `code`, `detail` and `requestId` from the RFC 9457 problem body; `requestId` falls back to the `Zakadi-Request-Id` header. The 404 `result_pending` throws `ResultPending`, a subclass of `ApiError`.
- Only a 429 or a 5xx is retried, at most twice: after `Retry-After` when the response carries one (a wait above 60 s throws the `ApiError` instead), after a jittered exponential backoff of at most 0.5 s, then 1 s, otherwise. `sessions.create` sends the same `Idempotency-Key` on every attempt, a random UUID unless `idempotencyKey` is given.
- `results.verifyToken` resolves to the claims of an unexpired ES256 JWS signed by a key of `/.well-known/jwks.json` and throws `VerificationError` otherwise. The JWKS is fetched once per client, and again when a token names an unknown `kid`.
- `webhooks.verify` returns the event when `Zakadi-Webhook-Signature` is `v1=` followed by the hex HMAC-SHA256, under the secret, of `<Zakadi-Webhook-Id>.<Zakadi-Webhook-Timestamp>.<raw body>`, compared in constant time, and the timestamp is no older than 300 s; it throws `VerificationError` otherwise.
- The client never logs, so no token reaches a log through it: ESLint's `no-console` is an error.

## Development

Node.js 24 and npm (npm only). `npm ci` installs the dependencies and the lefthook git hooks, which run the same commands as CI.

```sh
npm ci
npm run format            # prettier --check .
npm run lint              # eslint . && tsc --noEmit
npm test                  # build, then the unit tests with node --test
npm run test:integration  # build, then the tests against a fake API on node:http
npm pack --dry-run
lefthook run pre-commit --all-files
```

## Licence

Zakadi SDKs and client libraries are open source under the Apache License 2.0 (see `LICENSE`; the `NOTICE` file reserves the Zakadi trademarks). They are clients for the Zakadi service, which is proprietary; using it requires an account and acceptance of the Zakadi Terms of Service. Zakadi and the Zakadi logo are trademarks and are not covered by the Apache licence.
