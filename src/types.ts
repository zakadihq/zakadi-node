// The claims of a verified result token (spec/02-api.md 2.3), which the OpenAPI document
// does not describe. The request and response bodies are generated from it into
// src/generated/ (D84) and exported by src/index.ts.
import type { Result } from "./generated/api.schemas.js";

/** The claims of a verified `result_token` (2.3). */
export interface ResultTokenClaims {
  iss: string;
  /** The tenant id. */
  aud: string;
  /** The session id. */
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  decision: Result["decision"];
  band: Result["band"];
  confidence: Result["confidence"];
  reason_codes: string[];
  user_ref_hash: string;
  policy_version: number;
  models_hash: string;
}
