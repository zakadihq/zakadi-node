# zakadi-node

`@zakadi/node`, the server-side client for the Zakadi API for Node.js 20 and later: sessions, results, evidence and purges, webhook endpoints, tenant policy and usage, result-token verification and webhook signature verification. Specification: `zakadi/spec/02-api.md` section 2.11. The Python twin is `zakadi-python`.

Status: the layer generated from the OpenAPI document of `zakadi-server` (`src/generated/`) and the hand-written layer of section 2.11 over it. Not yet published to npm.

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

## Methods

Each method calls the function generated for its operation of the OpenAPI document. Bodies and queries take the API's field names, and each method resolves to the response body as sent, or to `undefined` for an answer without one (202 or 204).

| Method                                      | Operation                                                   | Retried |
| ------------------------------------------- | ----------------------------------------------------------- | ------- |
| `sessions.create(body, { idempotencyKey })` | `createSession`, `POST /v1/sessions`                        | yes     |
| `sessions.get(id)`                          | `getSession`, `GET /v1/sessions/{id}`                       | yes     |
| `sessions.list(query)`                      | `listSessions`, `GET /v1/sessions`                          | yes     |
| `sessions.cancel(id)`                       | `cancelSession`, `POST /v1/sessions/{id}/cancel`            | no      |
| `sessions.result(id)`                       | `getResult`, `GET /v1/sessions/{id}/result`                 | yes     |
| `sessions.evidence(id)`                     | `getEvidence`, `GET /v1/sessions/{id}/evidence`             | yes     |
| `sessions.purge(id)`                        | `purgeSession`, `DELETE /v1/sessions/{id}`                  | yes     |
| `subjects.purge(body)`                      | `purgeSubject`, `POST /v1/subjects/purge`                   | no      |
| `jobs.get(id)`                              | `getJob`, `GET /v1/jobs/{id}`                               | yes     |
| `webhooks.create(body, { idempotencyKey })` | `createWebhook`, `POST /v1/webhooks`                        | yes     |
| `webhooks.list()`                           | `listWebhooks`, `GET /v1/webhooks`                          | yes     |
| `webhooks.get(id)`                          | `getWebhook`, `GET /v1/webhooks/{id}`                       | yes     |
| `webhooks.update(id, body)`                 | `updateWebhook`, `PUT /v1/webhooks/{id}`                    | yes     |
| `webhooks.delete(id)`                       | `deleteWebhook`, `DELETE /v1/webhooks/{id}`                 | yes     |
| `webhooks.deliveries(id, query)`            | `listWebhookDeliveries`, `GET /v1/webhooks/{id}/deliveries` | yes     |
| `tenants.policy(id)`                        | `getPolicy`, `GET /v1/tenants/{id}/policy`                  | yes     |
| `tenants.updatePolicy(id, body)`            | `updatePolicy`, `PUT /v1/tenants/{id}/policy`               | yes     |
| `tenants.usage(id, query)`                  | `getUsage`, `GET /v1/tenants/{id}/usage`                    | yes     |

The SDK-facing public operations (`getSdkConfig`, `sendTelemetry`, `getHealth`, `getIngestHealth` and `getJwks`) have no method; `results.verifyToken` fetches the JWKS itself.

The types follow the document: `Session`, `SessionCreateParams`, `Result` and `WebhookEvent` are its `SessionCreated`, `SessionCreate`, `Result` and `WebhookEvent`, and the type namespace `models` names every schema of it, such as `models.Session` (what `sessions.get` returns) or `models.Policy`.

## Behaviour

- Methods and options are camelCase; request and response bodies keep the API's field names and pass through unchanged. Path parameters are percent-encoded.
- `baseUrl` defaults to `https://api.zakadi.dev`. Calls under `/v1/` send `Authorization: Bearer <apiKey>`; the public JWKS is fetched without it.
- A non-2xx response throws `ApiError` with `status`, and `code`, `detail` and `requestId` from the RFC 9457 problem body, such as a 404 `webhook_not_found`; `requestId` falls back to the `Zakadi-Request-Id` header. The 404 `result_pending` of `sessions.result`, `sessions.evidence` and `sessions.purge` throws `ResultPending`, a subclass of `ApiError`.
- Only the methods marked retried above, the idempotent ones, retry, and only a 429 or a 5xx, at most twice: after `Retry-After` when the response carries one (a wait above 60 s throws the `ApiError` instead), after a jittered exponential backoff of at most 0.5 s, then 1 s, otherwise. `sessions.cancel` and `subjects.purge` throw the first `ApiError`. `sessions.create` and `webhooks.create` send the same `Idempotency-Key` on every attempt, a random UUID unless `idempotencyKey` is given.
- `results.verifyToken` resolves to the claims of an unexpired ES256 JWS signed by a key of `/.well-known/jwks.json` and throws `VerificationError` otherwise. The JWKS is fetched once per client, and again when a token names an unknown `kid` and the last JWKS request, failed or not, is at least 60 s old; inside that floor such a token throws `VerificationError` without a request, concurrent verifications share one request, and a failed refetch keeps the cached keys.
- `webhooks.verify` returns the event when `Zakadi-Webhook-Signature` is `v1=` followed by the hex HMAC-SHA256, under the secret, of `<Zakadi-Webhook-Id>.<Zakadi-Webhook-Timestamp>.<raw body>`, compared in constant time, and the timestamp is no older than 300 s; it throws `VerificationError` otherwise.
- The client never logs, so no token reaches a log through it: ESLint's `no-console` is an error.

## The OpenAPI document and the generated layer

`openapi/openapi.yaml` is a copy of `api/openapi.yaml` of `zakadi-server`, the source of truth for the API (spec D84). `zakadi-server` is private and publishes no package, so the copy is pinned by commit and SHA-256 (D133) in `scripts/fetch-openapi.sh`: commit `061fcdd7d59f1a6aa3f1b8656fdafcf311afeb6b`, SHA-256 `5d5fe6f3529eb28a7cdc59293340f354a489a15167ab74244cf6ca4c43981b7c`. The copy is committed byte for byte, so Prettier skips it (`.prettierignore`).

- `sh scripts/fetch-openapi.sh` writes the copy through `gh api`, with a `gh` token that reads `zakadihq/zakadi-server`, and refuses bytes with another SHA-256, leaving the copy as it was. `sh scripts/fetch-openapi.sh --check` verifies the committed copy, offline.
- `npm run generate` writes `src/generated/` from the copy with orval 8.38.0 (`orval.config.js`): `api.ts` holds one `fetch` function per operation, which returns the success body and sends its request through `send` in `src/transport.ts`, and `api.schemas.ts` one type per schema. The files are formatted with Prettier, carry no banner and are never edited by hand.
- The pre-commit hook's `lint-generated` job and the `lint` job of CI fail when the copy does not match its SHA-256 or when `npm run generate` would change `src/generated/`. They read both from the index in a temporary directory, so the hook writes nothing to the tree.
- orval is pinned exactly and Dependabot skips it; `allowScripts` in `package.json` denies the install script of its `esbuild`, which orval runs from its platform package. A new pin, of the document or of orval, is a change of its own: run the script with the new commit and SHA-256, then `npm run generate`, and commit both.

The copy and the code generated from it are published under the Apache License 2.0 with the client (spec D142).

## Development

Node.js 24 and npm (npm only). `npm ci` installs the dependencies and the lefthook git hooks, which run the same commands as CI.

```sh
npm ci
npm run format            # prettier --check .
npm run lint              # eslint . && tsc --noEmit
npm test                  # build, then the unit tests with node --test
npm run test:integration  # build, then the tests against a fake API on node:http
npm run generate          # src/generated/ from openapi/openapi.yaml
sh scripts/fetch-openapi.sh --check
npm pack --dry-run
lefthook run pre-commit --all-files
```

## Licence

Zakadi SDKs and client libraries are open source under the Apache License 2.0 (see `LICENSE`; the `NOTICE` file reserves the Zakadi trademarks). They are clients for the Zakadi service, which is proprietary; using it requires an account and acceptance of the Zakadi Terms of Service. Zakadi and the Zakadi logo are trademarks and are not covered by the Apache licence.
