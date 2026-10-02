# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Zakadi`, the server-side client for the Zakadi API on Node.js 20 and later:
  `new Zakadi({ apiKey, baseUrl })` with `sessions.create`, `sessions.result`,
  `results.verifyToken` and `webhooks.verify`, and no runtime dependencies.
- `sessions.create` sends an `Idempotency-Key`, generated when none is supplied and
  kept across retries; a 429 or 5xx is retried at most twice, honouring `Retry-After`.
- Typed errors: `ApiError` with `status`, `code`, `detail` and `requestId`, its subclass
  `ResultPending` while a verdict does not exist, and `VerificationError`.
- `results.verifyToken` checks an ES256 result token against the JWKS, fetched once and
  again on an unknown `kid`; `webhooks.verify` checks the `v1=` HMAC-SHA256 signature
  in constant time and refuses a timestamp older than 300 s.
- The layer generated from the OpenAPI document of zakadi-server: `openapi/openapi.yaml`,
  a copy pinned by commit and SHA-256 that `scripts/fetch-openapi.sh` writes through
  `gh api` and checks offline with `--check`, and `npm run generate`, which writes
  `src/generated/` from it with orval 8.38.0. The `lint` job of CI and the pre-commit
  hook fail when the copy or `src/generated/` differs from what they produce.
- `sessions.get`, `sessions.list`, `sessions.cancel`, `sessions.evidence`,
  `sessions.purge`, `subjects.purge`, `jobs.get`, `webhooks.create`, `webhooks.list`,
  `webhooks.get`, `webhooks.update`, `webhooks.delete`, `webhooks.deliveries`,
  `tenants.policy`, `tenants.updatePolicy` and `tenants.usage`, over the generated
  functions. An answer without a body, the 202 of `sessions.purge` or the 204 of
  `webhooks.delete`, resolves to `undefined`. A 429 or 5xx is retried for every method
  but `sessions.cancel` and `subjects.purge`, and `webhooks.create` keeps one
  `Idempotency-Key`, given or generated, across its retries.
- `models`, a type namespace with every schema of the OpenAPI document.

### Changed

- `Session`, `SessionCreateParams`, `Result` and `WebhookEvent` are the generated
  `SessionCreated`, `SessionCreate`, `Result` and `WebhookEvent`: `Result` and the
  `data` of a `WebhookEvent` gain `superseded`, and their `band`, `confidence`,
  `quality` and `device` may be null, as `band` and `confidence` of
  `ResultTokenClaims` may.
- `results.verifyToken` refetches the JWKS for an unknown `kid` at most once per 60 s,
  every JWKS request counting, failed ones included: inside that floor such a token
  throws `VerificationError` without a request. Concurrent verifications share one JWKS
  request, and a failed refetch keeps the cached keys.

[Unreleased]: https://github.com/zakadihq/zakadi-node/commits/main
