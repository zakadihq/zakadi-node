// Request and response bodies of spec/02-api.md 2.2 to 2.4, written by hand until
// zakadi-server publishes api/openapi.yaml. Field names are the API's own (snake_case);
// the client passes bodies through unchanged.

/** A prompt pack the SDK loads (2.2). */
interface PackRef {
  lang: string;
  version: string;
  url: string;
}

/** Session states (2.2). */
type SessionStatus =
  | "created"
  | "connected"
  | "in_progress"
  | "verifying"
  | "passed"
  | "failed"
  | "inconclusive"
  | "expired"
  | "aborted";

/** The body of `POST /v1/sessions` (2.2). */
export interface SessionCreateParams {
  user_ref: string;
  locale: string;
  channel: "web" | "android" | "ios";
  device_correlation_id?: string;
  policy?: {
    version?: number;
    overrides?: { min_actions?: number; languages?: string[] };
  };
  ingest_hint?: { country?: string };
  callback?: { url: string; secret_ref?: string };
  /** Opaque, at most 2 KB, echoed in the result and the webhook. */
  metadata?: Record<string, unknown>;
  evidence?: {
    audit_frames?: boolean;
    clip?: boolean;
    retention_days?: number;
  };
}

/**
 * The 201 body of `POST /v1/sessions` (2.2). Pass `client_token`, `ingest`,
 * `prompt_pack` and `ui` to the SDK unchanged, and never log the token.
 */
export interface Session {
  session_id: string;
  client_token: string;
  expires_at: string;
  ingest: { region: string; url: string }[];
  prompt_pack: PackRef;
  ui: {
    consent_copy: Record<
      string,
      { title: string; body: string; recording_notice: string }
    >;
    brand: { primary: string; logo_url: string | null };
    badge_text: string | null;
    packs: PackRef[];
  };
  policy_version: number;
  status: SessionStatus;
}

/** The 200 body of `GET /v1/sessions/{id}/result` (2.3). */
export interface Result {
  session_id: string;
  decision: "pass" | "fail" | "inconclusive";
  band: "A" | "B" | "C";
  /** Calibrated probability that the session is live; act on `decision` and `band`. */
  confidence: number;
  reason_codes: string[];
  reasons_detail: { code: string; severity: string; text: string }[];
  challenges: {
    id: string;
    kind: string;
    result: string;
    attempts: number;
    latency_ms: number;
  }[];
  quality: {
    lighting: "low" | "ok" | "bright";
    face_size: string;
    network_rung_median: number;
    received_fps_median: number;
  };
  device: { platform: string; attested: boolean; attestation_verdict: string };
  models: Record<string, string>;
  policy_version: number;
  verdict_at: string;
  evidence: { audit_frames: number; clip: boolean; expires_at: string };
  metadata: Record<string, unknown>;
  /** ES256 JWS over the verdict; check it with `results.verifyToken`. */
  result_token: string;
}

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
  confidence: number;
  reason_codes: string[];
  user_ref_hash: string;
  policy_version: number;
  models_hash: string;
}

/** A webhook delivery body (2.4); events are idempotent by `id`. */
export interface WebhookEvent {
  id: string;
  type:
    | "zakadi.session.completed"
    | "zakadi.session.aborted"
    | "zakadi.session.expired";
  created_at: string;
  data: Omit<Result, "result_token">;
  result_token: string;
}
