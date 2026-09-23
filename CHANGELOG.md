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

### Changed

- `results.verifyToken` refetches the JWKS for an unknown `kid` at most once per 60 s,
  every JWKS request counting, failed ones included: inside that floor such a token
  throws `VerificationError` without a request. Concurrent verifications share one JWKS
  request, and a failed refetch keeps the cached keys.

[Unreleased]: https://github.com/zakadihq/zakadi-node/commits/main
