// @zakadi/node: the server-side client for the Zakadi API (spec/02-api.md 2.11).
export { Zakadi } from "./client.js";
export { ApiError, ResultPending, VerificationError } from "./errors.js";
export type {
  Result,
  ResultTokenClaims,
  Session,
  SessionCreateParams,
  WebhookEvent,
} from "./types.js";
