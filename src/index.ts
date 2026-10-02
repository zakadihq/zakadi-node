// @zakadi/node: the server-side client for the Zakadi API (spec/02-api.md 2.11).
export { Zakadi } from "./client.js";
export { ApiError, ResultPending, VerificationError } from "./errors.js";
// The bodies generated from the OpenAPI document under the names the Python client
// shares (D71, D84).
export type {
  Result,
  SessionCreated as Session,
  SessionCreate as SessionCreateParams,
  WebhookEvent,
} from "./generated/api.schemas.js";
export type { ResultTokenClaims } from "./types.js";
/** Every schema of the OpenAPI document, by its name there (D84). */
export type * as models from "./generated/api.schemas.js";
