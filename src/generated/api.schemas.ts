/**
 * A session id, `ses_` and the session ULID (the protocol's `sessionId`).
 * @pattern ^ses_[A-Za-z0-9]+$
 */
export type SessionId = string;

/**
 * A webhook event id, `evt_` and a ULID.
 * @pattern ^evt_[A-Za-z0-9]+$
 */
export type EventId = string;

/**
 * A job id, `job_` and a ULID.
 * @pattern ^job_[A-Za-z0-9]+$
 */
export type JobId = string;

/**
 * A BCP 47 language tag with a region, as the prompt packs are keyed.
 * @pattern ^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$
 */
export type Locale = string;

/**
 * A deployment region.
 * @pattern ^[a-z]{2}-[a-z]+-[0-9]+$
 */
export type Region = string;

/**
 * A semantic version.
 * @pattern ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$
 */
export type SemVer = string;

/**
 * The platform a session runs on.
 */
export type Channel = (typeof Channel)[keyof typeof Channel];

export const Channel = {
  web: "web",
  android: "android",
  ios: "ios",
} as const;

/**
 * The assurance band.
 */
export type Band = (typeof Band)[keyof typeof Band];

export const Band = {
  A: "A",
  B: "B",
  C: "C",
} as const;

/**
 * A session's status.
 */
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionStatus = {
  created: "created",
  connected: "connected",
  in_progress: "in_progress",
  verifying: "verifying",
  passed: "passed",
  failed: "failed",
  inconclusive: "inconclusive",
  expired: "expired",
  aborted: "aborted",
} as const;

/**
 * The verdict. RPs act on `decision` and `band`.
 */
export type Decision = (typeof Decision)[keyof typeof Decision];

export const Decision = {
  pass: "pass",
  fail: "fail",
  inconclusive: "inconclusive",
} as const;

/**
 * A challenge kind (the protocol's `challengeKind`).
 */
export type ChallengeKind = (typeof ChallengeKind)[keyof typeof ChallengeKind];

export const ChallengeKind = {
  head_turn: "head_turn",
  distance: "distance",
  fingers: "fingers",
  digits: "digits",
  blink: "blink",
  expression: "expression",
  hand_over_face: "hand_over_face",
  look_profile: "look_profile",
} as const;

/**
 * A reason code of one of the families `ACTIONS_*`, `PAD_*`, `DIGITAL_*`, `NONCE_*`, `TIMING_*`, `AUDIO_*`, `CAMERA_*`, `NETWORK_*`, `DEVICE_*`, `DEDUPE_*`, `QUALITY_*` and `SESSION_*`; the list with severities is `docs/reason-codes.md`, versioned with the fusion configuration.
 * @pattern ^(ACTIONS|PAD|DIGITAL|NONCE|TIMING|AUDIO|CAMERA|NETWORK|DEVICE|DEDUPE|QUALITY|SESSION)_[A-Z0-9_]+$
 */
export type ReasonCode = string;

/**
 * Opaque RP data, at most 2 KB, echoed in the session, the result and the webhook; an empty object when none was given.
 */
export interface Metadata {
  [key: string]: unknown;
}

/**
 * A problem `code` (2.9).
 */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorCode = {
  unauthorized: "unauthorized",
  forbidden_scope: "forbidden_scope",
  ip_not_allowed: "ip_not_allowed",
  rate_limited: "rate_limited",
  validation_error: "validation_error",
  idempotency_conflict: "idempotency_conflict",
  tenant_suspended: "tenant_suspended",
  policy_version_unknown: "policy_version_unknown",
  session_not_found: "session_not_found",
  webhook_not_found: "webhook_not_found",
  job_not_found: "job_not_found",
  session_not_cancellable: "session_not_cancellable",
  result_pending: "result_pending",
  evidence_expired: "evidence_expired",
  webhook_limit: "webhook_limit",
  internal_error: "internal_error",
} as const;

/**
 * An RFC 9457 problem, served as `application/problem+json`. `type` is `https://docs.zakadi.dev/errors/` and the `code`.
 */
export interface Problem {
  /** Identifies the problem type. */
  type: string;
  /** A short summary of the problem type. */
  title: string;
  /**
   * The HTTP status code.
   * @minimum 400
   * @maximum 599
   */
  status: number;
  /** This occurrence of the problem, for a person to read. */
  detail: string;
  code: ErrorCode;
  /** The request's `Zakadi-Request-Id`. */
  request_id: string;
}

/**
 * Per-session overrides of the pinned policy.
 */
export type SessionPolicyOverrides = {
  /**
   * The fewest actions the session asks for.
   * @minimum 1
   */
  min_actions?: number;
  /**
   * The languages the end user may choose from.
   * @minItems 1
   */
  languages?: Locale[];
};

/**
 * The tenant policy version the session pins, the current one when absent, and per-session overrides.
 */
export interface SessionPolicy {
  /**
   * A version of the tenant's policy.
   * @minimum 1
   */
  version?: number;
  /** Per-session overrides of the pinned policy. */
  overrides?: SessionPolicyOverrides;
}

/**
 * Where the end user is, to order the ingest regions.
 */
export interface IngestHint {
  /**
   * An ISO 3166-1 alpha-2 country code.
   * @pattern ^[A-Z]{2}$
   */
  country?: string;
}

/**
 * A per-session webhook endpoint and the reference of the secret that signs its deliveries.
 */
export interface Callback {
  /** The endpoint. */
  url: string;
  /**
   * The `secret_ref` of a registered secret.
   * @minLength 1
   */
  secret_ref?: string;
}

/**
 * What evidence the session keeps. `clip` needs the tenant policy's `evidence_clip_allowed`, and `retention_days` is capped by its `evidence_days_max`.
 */
export interface EvidenceRequest {
  /** Keep audit frames. */
  audit_frames?: boolean;
  /** Keep a clip. */
  clip?: boolean;
  /**
   * Days the evidence is kept.
   * @minimum 1
   */
  retention_days?: number;
}

/**
 * The body of `createSession`.
 */
export interface SessionCreate {
  /**
   * The RP's reference for the end user; stored hashed, and the key of the per-user limits and of `purgeSubject`.
   * @minLength 1
   */
  user_ref: string;
  locale: Locale;
  channel: Channel;
  /**
   * Optional opaque device reference the RP defines; stored hashed.
   * @minLength 1
   */
  device_correlation_id?: string;
  policy?: SessionPolicy;
  ingest_hint?: IngestHint;
  callback?: Callback;
  metadata?: Metadata;
  evidence?: EvidenceRequest;
}

/**
 * An ingest endpoint for the session.
 */
export interface IngestCandidate {
  region: Region;
  /** The session's WebSocket URL in that region. */
  url: string;
}

/**
 * A prompt pack.
 */
export interface PackRef {
  lang: Locale;
  /**
   * The pack version.
   * @minLength 1
   */
  version: string;
  /** The pack's manifest. */
  url: string;
}

/**
 * Consent copy in one language.
 */
export interface ConsentCopy {
  /** The consent screen's title. */
  title: string;
  /** The consent text. */
  body: string;
  /** What is recorded and kept. */
  recording_notice: string;
}

/**
 * Brand tokens.
 */
export interface Brand {
  /**
   * The primary colour, as a hex RGB colour.
   * @pattern ^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$
   */
  primary: string;
  /**
   * The logo, or null for none.
   * @nullable
   */
  logo_url: string | null;
}

/**
 * Consent copy keyed by language tag.
 */
export type SessionUiConsentCopy = { [key: string]: ConsentCopy };

/**
 * What the SDK shows (D11): the tenant's consent copy per language, brand tokens, badge text and the alternate packs the user may switch to. Passed to the SDK unchanged as `sessionUi`.
 */
export interface SessionUi {
  /** Consent copy keyed by language tag. */
  consent_copy: SessionUiConsentCopy;
  brand: Brand;
  /**
   * Text of the badge, or null for none.
   * @nullable
   */
  badge_text: string | null;
  /** The packs the user may switch to. */
  packs: PackRef[];
}

/**
 * The `createSession` response. `client_token`, `ingest`, `prompt_pack` and `ui` go to the SDK unchanged, and the token is never logged.
 */
export interface SessionCreated {
  session_id: SessionId;
  /** An ES256 JWT for the ingest edge, valid for 300 s and usable once, with the claims `iss`, `aud` (`ingest`), `sub` (the session id), `tid`, `jti`, `iat`, `nbf`, `exp`, `pol`, `band_max`, `ing`, `nonce` and `lang`. */
  client_token: string;
  /** When `client_token` expires. */
  expires_at: string;
  /**
   * The ingest endpoints the SDK may connect to, in order.
   * @minItems 1
   */
  ingest: IngestCandidate[];
  prompt_pack: PackRef;
  ui: SessionUi;
  /**
   * The policy version the session pinned.
   * @minimum 1
   */
  policy_version: number;
  status: SessionStatus;
}

/**
 * The assurance band, or null until it is known.
 * @nullable
 */
export type SessionBand = (typeof SessionBand)[keyof typeof SessionBand] | null;

export const SessionBand = {
  A: "A",
  B: "B",
  C: "C",
} as const;

/**
 * A session's status and timestamps (`getSession`).
 */
export interface Session {
  session_id: SessionId;
  status: SessionStatus;
  /** When the session was created. */
  created_at: string;
  /**
   * When the SDK connected, or null before it did.
   * @nullable
   */
  connected_at: string | null;
  /**
   * When the session ended, or null before it did.
   * @nullable
   */
  ended_at: string | null;
  /**
   * When the verdict was written, or null before it was.
   * @nullable
   */
  verdict_at: string | null;
  /**
   * The policy version the session pinned.
   * @minimum 1
   */
  policy_version: number;
  channel: Channel;
  /**
   * The ingest region the SDK connected to, or null before it connected.
   * @nullable
   * @pattern ^[a-z]{2}-[a-z]+-[0-9]+$
   */
  ingest_region: string | null;
  /**
   * The assurance band, or null until it is known.
   * @nullable
   */
  band: SessionBand;
  metadata: Metadata;
}

/**
 * One page of sessions, newest first.
 */
export interface SessionPage {
  /** The sessions. */
  data: Session[];
  /**
   * The `cursor` of the next page, or null on the last page.
   * @nullable
   */
  next_cursor: string | null;
}

/**
 * The assurance band.
 * @nullable
 */
export type ResultDataBand =
  (typeof ResultDataBand)[keyof typeof ResultDataBand] | null;

export const ResultDataBand = {
  A: "A",
  B: "B",
  C: "C",
} as const;

/**
 * A reason code with its severity and a note.
 */
export interface ReasonDetail {
  code: ReasonCode;
  /** The code's severity in `docs/reason-codes.md`. */
  severity: string;
  /** A note for a person to read. */
  text: string;
}

/**
 * One challenge and its outcome.
 */
export interface ChallengeResult {
  /**
   * The challenge id of the protocol's `action`.
   * @minLength 1
   * @maxLength 32
   */
  id: string;
  kind: ChallengeKind;
  /** The outcome. */
  result: string;
  /**
   * Attempts made.
   * @minimum 1
   */
  attempts: number;
  /**
   * Response latency in milliseconds.
   * @minimum 0
   */
  latency_ms: number;
}

/**
 * The lighting.
 */
export type QualityLighting =
  (typeof QualityLighting)[keyof typeof QualityLighting];

export const QualityLighting = {
  low: "low",
  ok: "ok",
  bright: "bright",
} as const;

/**
 * Capture and network quality, or null when no media arrived.
 * @nullable
 */
export type Quality = {
  /** The lighting. */
  lighting: QualityLighting;
  /** The face size. */
  face_size: string;
  /**
   * The median ladder rung.
   * @minimum 0
   * @maximum 15
   */
  network_rung_median: number;
  /**
   * The median received frame rate.
   * @minimum 0
   */
  received_fps_median: number;
} | null;

/**
 * The device and its attestation, or null when no media arrived.
 * @nullable
 */
export type Device = {
  platform: Channel;
  /** Whether a platform attestation verified. */
  attested: boolean;
  /**
   * The platform's attestation verdict, or null without one.
   * @nullable
   */
  attestation_verdict: string | null;
} | null;

/**
 * The model versions behind the verdict by role (`pad_trunk`, `digital_head`, `fusion`, `landmarks`); empty when no model ran.
 */
export interface Models {
  [key: string]: string;
}

/**
 * What evidence the session kept, and until when.
 */
export interface ResultEvidence {
  /**
   * Audit frames kept.
   * @minimum 0
   */
  audit_frames: number;
  /** Whether a clip was kept. */
  clip: boolean;
  /**
   * When the evidence is deleted, or null when nothing was kept.
   * @nullable
   */
  expires_at: string | null;
}

/**
 * A session's verdict without its token: the `data` of a webhook delivery, and with `result_token` the `getResult` response. `band`, `confidence`, `quality` and `device` are null for a session that ended before any media arrived.
 */
export interface ResultData {
  session_id: SessionId;
  decision: Decision;
  /**
   * The assurance band.
   * @nullable
   */
  band: ResultDataBand;
  /**
   * The fusion model's calibrated probability that the session is live and unmanipulated, for analytics.
   * @minimum 0
   * @maximum 1
   * @nullable
   */
  confidence: number | null;
  /** The reason codes behind the decision. */
  reason_codes: ReasonCode[];
  /** Reason codes with their severity and a note. */
  reasons_detail: ReasonDetail[];
  /** The challenges issued, in order. */
  challenges: ChallengeResult[];
  quality: Quality | null;
  device: Device | null;
  models: Models;
  /**
   * The policy version the session pinned.
   * @minimum 1
   */
  policy_version: number;
  /** When the verdict was written. */
  verdict_at: string;
  evidence: ResultEvidence;
  metadata: Metadata;
  /** True on a verdict that replaced one written after a verdict timeout. */
  superseded?: boolean;
}

/**
 * The `getResult` response, the verdict with its `result_token`.
 */
export type Result = ResultData & {
  /** An ES256 JWS, verified against `/.well-known/jwks.json`, over `iss`, `aud` (the tenant id), `sub` (the session id), `jti`, `iat`, `exp` (`iat` + 3600), `decision`, `band`, `confidence`, `reason_codes`, `user_ref_hash`, `policy_version` and `models_hash`. */
  result_token: string;
};

/**
 * Calibrated sub-scores by name.
 */
export type SessionEvidenceScores = { [key: string]: number };

/**
 * Forensic scalars by name.
 */
export type SessionEvidenceForensics = { [key: string]: number };

/**
 * Timing distributions and clock statistics by name.
 */
export type SessionEvidenceTiming = { [key: string]: unknown };

/**
 * The parameters the server chose (the protocol's `action.params`).
 */
export type EvidenceChallengeParams = { [key: string]: unknown };

/**
 * This challenge's scores by name.
 */
export type EvidenceChallengeScores = { [key: string]: number };

/**
 * One challenge with its parameters, outcome and scores.
 */
export interface EvidenceChallenge {
  /**
   * The challenge's position in the session.
   * @minimum 0
   */
  idx: number;
  /**
   * The challenge id of the protocol's `action`.
   * @minLength 1
   * @maxLength 32
   */
  id: string;
  kind: ChallengeKind;
  /** The parameters the server chose (the protocol's `action.params`). */
  params: EvidenceChallengeParams;
  /** The outcome. */
  result: string;
  /**
   * Attempts made.
   * @minimum 1
   */
  attempts: number;
  /**
   * Response latency in milliseconds.
   * @minimum 0
   */
  latency_ms: number;
  /** This challenge's scores by name. */
  scores: EvidenceChallengeScores;
}

/**
 * A short-lived signed URL, valid for 15 minutes.
 */
export interface SignedUrl {
  /** The URL. */
  url: string;
  /** When the URL stops working. */
  expires_at: string;
}

/**
 * The `getEvidence` response, from the `result_scores`, `challenges` and `evidence` tables (03 3.8): sub-scores, forensic scalars, timing distributions, per-challenge scores and signed URLs.
 */
export interface SessionEvidence {
  session_id: SessionId;
  /** Calibrated sub-scores by name. */
  scores: SessionEvidenceScores;
  /** Forensic scalars by name. */
  forensics: SessionEvidenceForensics;
  /** Timing distributions and clock statistics by name. */
  timing: SessionEvidenceTiming;
  /** The challenges issued, in order, with their scores. */
  challenges: EvidenceChallenge[];
  /** Signed URLs of the audit frames. */
  audit_frames: SignedUrl[];
  /** A signed URL of the clip, or null when none was kept. */
  clip: SignedUrl | null;
  /** When the evidence is deleted. */
  expires_at: string;
}

/**
 * The body of `purgeSubject`.
 */
export interface SubjectPurge {
  /**
   * The end user whose data is purged across sessions.
   * @minLength 1
   */
  user_ref: string;
}

/**
 * What the job does.
 */
export type JobKind = (typeof JobKind)[keyof typeof JobKind];

export const JobKind = {
  subject_purge: "subject_purge",
} as const;

/**
 * The job's state.
 */
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobStatus = {
  pending: "pending",
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
} as const;

/**
 * A background job; `purgeSubject` starts one.
 */
export interface Job {
  job_id: JobId;
  /** What the job does. */
  kind: JobKind;
  /** The job's state. */
  status: JobStatus;
  /** When the job was accepted. */
  created_at: string;
  /**
   * When the job finished, or null while it runs.
   * @nullable
   */
  completed_at: string | null;
}

/**
 * A webhook event type.
 */
export type WebhookEventType =
  (typeof WebhookEventType)[keyof typeof WebhookEventType];

export const WebhookEventType = {
  zakadisessioncompleted: "zakadi.session.completed",
  zakadisessionaborted: "zakadi.session.aborted",
  zakadisessionexpired: "zakadi.session.expired",
} as const;

/**
 * The body of `createWebhook`.
 */
export interface WebhookCreate {
  /** The endpoint. */
  url: string;
  /**
   * The events delivered to it.
   * @minItems 1
   */
  events: WebhookEventType[];
  /**
   * The signing secret, at least 32 bytes; never returned.
   * @minLength 32
   */
  secret: string;
  /** Whether deliveries are made. */
  active?: boolean;
}

/**
 * The body of `updateWebhook`.
 */
export interface WebhookUpdate {
  /** The endpoint. */
  url: string;
  /**
   * The events delivered to it.
   * @minItems 1
   */
  events: WebhookEventType[];
  /** Whether deliveries are made. */
  active: boolean;
  /**
   * A new signing secret, at least 32 bytes; the current one is kept when absent.
   * @minLength 32
   */
  secret?: string;
}

/**
 * A webhook endpoint (the `webhooks` table of 03 3.8), without its secret.
 */
export interface Webhook {
  /** The endpoint's id. */
  webhook_id: string;
  /** The endpoint. */
  url: string;
  /** The events delivered to it. */
  events: WebhookEventType[];
  /** The reference of the signing secret, which a session's `callback.secret_ref` may name. */
  secret_ref: string;
  /** Whether deliveries are made. */
  active: boolean;
  /** When the endpoint was created. */
  created_at: string;
}

/**
 * The tenant's endpoints.
 */
export interface WebhookList {
  /**
   * The endpoints, at most 5.
   * @maxItems 5
   */
  data: Webhook[];
}

/**
 * One delivery attempt (the `webhook_attempts` table of 03 3.8).
 */
export interface WebhookDelivery {
  /** The endpoint. */
  webhook_id: string;
  event_id: EventId;
  /**
   * The attempt number, 1 for the first delivery.
   * @minimum 1
   */
  attempt: number;
  /**
   * The receiver's HTTP status, or null when it did not answer.
   * @minimum 100
   * @maximum 599
   * @nullable
   */
  status: number | null;
  /**
   * Why the attempt failed, or null when it succeeded.
   * @nullable
   */
  error: string | null;
  /** When the attempt was made. */
  at: string;
}

/**
 * One page of delivery attempts, newest first.
 */
export interface WebhookDeliveryPage {
  /** The attempts. */
  data: WebhookDelivery[];
  /**
   * The `cursor` of the next page, or null on the last page.
   * @nullable
   */
  next_cursor: string | null;
}

/**
 * A webhook delivery body. `data` is the result without `result_token`, which travels beside it; events are idempotent by `id`.
 */
export interface WebhookEvent {
  id: EventId;
  type: WebhookEventType;
  /** When the event was created. */
  created_at: string;
  data: ResultData;
  /** The result's ES256 JWS, as in `getResult`. */
  result_token: string;
}

/**
 * How many actions a session asks for, and from which pools.
 */
export interface PolicyActions {
  /**
   * The fewest actions.
   * @minimum 1
   */
  min: number;
  /**
   * The most actions.
   * @minimum 1
   */
  max: number;
  /**
   * The kinds actions are drawn from.
   * @minItems 1
   */
  pool: ChallengeKind[];
  /** The kinds a step-up draws from. */
  step_up_pool: ChallengeKind[];
  /** Require an action that checks geometry. */
  require_geometry: boolean;
  /** Require a high-entropy action. */
  require_high_entropy: boolean;
}

/**
 * Which bands and channels the tenant accepts.
 */
export interface PolicyAssurance {
  /**
   * The bands accepted.
   * @minItems 1
   */
  accept_bands: Band[];
  /** Whether web sessions are allowed. */
  web_allowed: boolean;
  /** Whether a platform attestation is required. */
  attestation_required: boolean;
}

/**
 * The profile; each is published with its measured BPCER and APCER per release.
 */
export type PolicyThresholdsProfile =
  (typeof PolicyThresholdsProfile)[keyof typeof PolicyThresholdsProfile];

export const PolicyThresholdsProfile = {
  balanced: "balanced",
  strict: "strict",
  lenient: "lenient",
} as const;

/**
 * The named operating point of the fusion model.
 */
export interface PolicyThresholds {
  /** The profile; each is published with its measured BPCER and APCER per release. */
  profile: PolicyThresholdsProfile;
}

/**
 * Attempt and velocity limits.
 */
export interface PolicyAttempts {
  /**
   * Attempts per action.
   * @minimum 1
   */
  per_action: number;
  /**
   * Restarts per session.
   * @minimum 0
   */
  restarts: number;
  /**
   * Sessions per `user_ref` per day.
   * @minimum 1
   */
  sessions_per_user_ref_per_day: number;
  /**
   * Sessions per face per day.
   * @minimum 1
   */
  sessions_per_face_per_day: number;
}

/**
 * Step-up challenges and the human handoff.
 */
export interface PolicyStepUp {
  /** Whether step-up challenges are used. */
  enabled: boolean;
  /** Whether sessions may be handed to a person. */
  human_handoff: boolean;
  /**
   * Where the handoff goes, or null for none.
   * @nullable
   */
  handoff_url: string | null;
}

/**
 * Retention periods in days.
 */
export interface PolicyRetention {
  /**
   * Days results are kept.
   * @minimum 1
   */
  results_days: number;
  /**
   * Days evidence is kept when a session does not say.
   * @minimum 0
   */
  evidence_days_default: number;
  /**
   * The most days a session may keep evidence.
   * @minimum 0
   */
  evidence_days_max: number;
  /** Whether sessions may keep a clip. */
  evidence_clip_allowed: boolean;
  /**
   * Days face embeddings are kept.
   * @minimum 0
   */
  embeddings_days: number;
}

/**
 * Duplicate detection.
 */
export interface PolicyDedupe {
  /** Whether duplicates are detected. */
  enabled: boolean;
  /** Whether faces are matched across sessions. */
  cross_session_face_match: boolean;
}

/**
 * How tokens are verified.
 */
export type PolicyAttestationPlayIntegrityVerify =
  (typeof PolicyAttestationPlayIntegrityVerify)[keyof typeof PolicyAttestationPlayIntegrityVerify];

export const PolicyAttestationPlayIntegrityVerify = {
  google_api: "google_api",
  local: "local",
} as const;

/**
 * Play Integrity: the host app's Google Cloud project number, and either `google_api` with a service-account credential the tenant grants or `local` with the keys the tenant exported from Play Console.
 */
export type PolicyAttestationPlayIntegrity = {
  /**
   * The Google Cloud project number.
   * @pattern ^[0-9]+$
   */
  cloud_project_number: string;
  /** How tokens are verified. */
  verify: PolicyAttestationPlayIntegrityVerify;
  /** The reference of the credential or keys. */
  credentials_ref: string;
};

/**
 * App Attest.
 */
export type PolicyAttestationAppAttest = {
  /** The Apple team ID. */
  team_id: string;
  /** The app's bundle ID. */
  bundle_id: string;
};

/**
 * What the verdict worker needs to verify platform tokens. Without it, attestation tokens are ignored and the session's band is at most `B`.
 */
export interface PolicyAttestation {
  /** Play Integrity: the host app's Google Cloud project number, and either `google_api` with a service-account credential the tenant grants or `local` with the keys the tenant exported from Play Console. */
  play_integrity?: PolicyAttestationPlayIntegrity;
  /** App Attest. */
  app_attest?: PolicyAttestationAppAttest;
}

/**
 * Where sessions are ingested and scored.
 */
export interface PolicyResidency {
  /**
   * The ingest regions allowed.
   * @minItems 1
   */
  ingest_regions: Region[];
  /** The regions models may run in. */
  gpu_regions: Region[];
  /** Whether data stays in the end user's country. */
  in_country_only: boolean;
}

/**
 * The on-screen character, or none.
 */
export type PolicyUiCharacter =
  (typeof PolicyUiCharacter)[keyof typeof PolicyUiCharacter];

export const PolicyUiCharacter = {
  default: "default",
  none: "none",
} as const;

/**
 * The tenant's UI settings.
 */
export interface PolicyUi {
  /** The on-screen character, or none. */
  character: PolicyUiCharacter;
  brand: Brand;
  /**
   * Text of the badge, or null for none.
   * @nullable
   */
  badge_text: string | null;
}

/**
 * The body of `updatePolicy`: every setting of the tenant policy (2.5). `thresholds.profile` names an operating point of the fusion model; tenants cannot set raw thresholds.
 */
export interface PolicySettings {
  actions: PolicyActions;
  assurance: PolicyAssurance;
  thresholds: PolicyThresholds;
  attempts: PolicyAttempts;
  step_up: PolicyStepUp;
  /**
   * The languages sessions may use.
   * @minItems 1
   */
  languages: Locale[];
  retention: PolicyRetention;
  dedupe: PolicyDedupe;
  attestation?: PolicyAttestation;
  residency: PolicyResidency;
  ui: PolicyUi;
}

/**
 * The tenant policy (`getPolicy`, `updatePolicy`) with its immutable `version`.
 */
export type Policy = PolicySettings & {
  /**
   * The version; every `updatePolicy` creates the next one.
   * @minimum 1
   */
  version: number;
};

/**
 * The band, or null for sessions that ended without one.
 * @nullable
 */
export type UsageRowBand =
  (typeof UsageRowBand)[keyof typeof UsageRowBand] | null;

export const UsageRowBand = {
  A: "A",
  B: "B",
  C: "C",
} as const;

/**
 * Sessions of one day, channel, band and status.
 */
export interface UsageRow {
  /** The UTC day. */
  day: string;
  channel: Channel;
  /**
   * The band, or null for sessions that ended without one.
   * @nullable
   */
  band: UsageRowBand;
  status: SessionStatus;
  /**
   * Sessions.
   * @minimum 0
   */
  count: number;
}

/**
 * Session counts per UTC day (the `usage_daily` table of 03 3.8).
 */
export interface Usage {
  /** The first day counted. */
  from: string;
  /** The last day counted. */
  to: string;
  /** One row per day, channel, band and status with sessions. */
  data: UsageRow[];
}

/**
 * The lowest wrapper version the SDK starts under, by wrapper package.
 */
export type SdkConfigWrapperMinVersion = { [key: string]: SemVer };

/**
 * The in-band probe the SDK sends.
 */
export type SdkConfigProbe = {
  /**
   * Probe messages.
   * @minimum 1
   */
  count: number;
  /**
   * Bytes per probe message.
   * @minimum 1
   */
  bytes: number;
};

/**
 * Every key present must match.
 */
export interface QuirkMatch {
  platform?: Channel;
  /** A prefix of the device model; on web, from User-Agent Client Hints where available. */
  model_prefix?: string;
  /** The browser. */
  browser?: string;
  /**
   * The lowest browser major version.
   * @minimum 0
   */
  browser_major_min?: number;
  /**
   * The highest browser major version.
   * @minimum 0
   */
  browser_major_max?: number;
  /**
   * The lowest OS major version.
   * @minimum 0
   */
  os_major_min?: number;
  /**
   * The highest OS major version.
   * @minimum 0
   */
  os_major_max?: number;
}

/**
 * Forces the `mediarecorder` profile.
 */
export type QuirkCapsProfile =
  (typeof QuirkCapsProfile)[keyof typeof QuirkCapsProfile];

export const QuirkCapsProfile = {
  mediarecorder: "mediarecorder",
} as const;

/**
 * The caps applied to a matching device.
 */
export interface QuirkCaps {
  /**
   * The highest frame rate.
   * @minimum 1
   */
  max_fps?: number;
  /**
   * The best rung allowed.
   * @minimum 0
   * @maximum 15
   */
  max_rung?: number;
  /** Forces the `mediarecorder` profile. */
  profile?: QuirkCapsProfile;
  /** Prefer the software H.264 encoder. */
  prefer_software_encoder?: boolean;
}

/**
 * Caps for the devices `match` selects.
 */
export interface DeviceQuirk {
  match: QuirkMatch;
  caps: QuirkCaps;
}

/**
 * The `getSdkConfig` response (2.6, D10, D38).
 */
export interface SdkConfig {
  min_version: SemVer;
  latest_version: SemVer;
  /** When true the SDK refuses to start and shows `message`. */
  kill_switch: boolean;
  /** The lowest wrapper version the SDK starts under, by wrapper package. */
  wrapper_min_version: SdkConfigWrapperMinVersion;
  /**
   * What the SDK shows when it refuses to start, or null.
   * @nullable
   */
  message: string | null;
  /**
   * The protocol versions the ingest serves.
   * @minItems 1
   * @items.pattern ^zakadi\.v[0-9]+$
   */
  protocol: string[];
  /** The prompt-pack CDN base URL. */
  prompt_pack_cdn: string;
  /** The in-band probe the SDK sends. */
  probe: SdkConfigProbe;
  /**
   * The version of the rung ladder.
   * @minimum 1
   */
  ladder_version: number;
  /** Per-device capability caps. */
  device_quirks: DeviceQuirk[];
}

/**
 * The wrapper package embedding the SDK.
 */
export type SdkIdentityWrapper = {
  /** The wrapper package. */
  name: string;
  /** The wrapper version. */
  version: string;
};

/**
 * The SDK sending the events, as `hello.sdk` of the protocol reports it.
 */
export interface SdkIdentity {
  platform: Channel;
  /** The SDK package. */
  name: string;
  /** The SDK version. */
  version: string;
  /** The operating system. */
  os?: string;
  /** The device model. */
  device?: string;
  /** The browser, on web only. */
  browser?: string;
  /** The wrapper package embedding the SDK. */
  wrapper?: SdkIdentityWrapper;
}

/**
 * The event's fields.
 */
export type TelemetryEventFields = { [key: string]: unknown };

/**
 * One telemetry event.
 */
export interface TelemetryEvent {
  /**
   * The event name.
   * @pattern ^[a-z][a-z0-9_]*$
   */
  name: string;
  /**
   * Milliseconds since `sdk_start` on the SDK's monotonic clock.
   * @minimum 0
   */
  t_ms: number;
  /** The event's fields. */
  fields?: TelemetryEventFields;
}

/**
 * The body of `sendTelemetry`: at most 100 events and 32 KB, with no media, tokens, landmarks or user identifiers.
 */
export interface TelemetryBatch {
  session_id: SessionId;
  sdk: SdkIdentity;
  /**
   * The events, oldest first.
   * @minItems 1
   * @maxItems 100
   */
  events: TelemetryEvent[];
}

/**
 * Always `ok` when the control plane answers.
 */
export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

export const HealthStatus = {
  ok: "ok",
} as const;

/**
 * Control plane liveness.
 */
export interface Health {
  /** Always `ok` when the control plane answers. */
  status: HealthStatus;
}

/**
 * One ingest region's health and admission headroom.
 */
export interface RegionHealth {
  region: Region;
  /** Whether an edge in the region admits sessions. */
  healthy: boolean;
  /**
   * The free fraction of the region's admission capacity.
   * @minimum 0
   * @maximum 1
   */
  headroom: number;
}

/**
 * Ingest health per region.
 */
export interface IngestHealth {
  /** One entry per ingest region. */
  regions: RegionHealth[];
}

/**
 * The key type.
 */
export type JwkKty = (typeof JwkKty)[keyof typeof JwkKty];

export const JwkKty = {
  EC: "EC",
} as const;

/**
 * The curve.
 */
export type JwkCrv = (typeof JwkCrv)[keyof typeof JwkCrv];

export const JwkCrv = {
  "P-256": "P-256",
} as const;

/**
 * The key use.
 */
export type JwkUse = (typeof JwkUse)[keyof typeof JwkUse];

export const JwkUse = {
  sig: "sig",
} as const;

/**
 * The algorithm.
 */
export type JwkAlg = (typeof JwkAlg)[keyof typeof JwkAlg];

export const JwkAlg = {
  ES256: "ES256",
} as const;

/**
 * An ES256 public key.
 */
export interface Jwk {
  /** The key type. */
  kty: JwkKty;
  /** The curve. */
  crv: JwkCrv;
  /**
   * The key id tokens name in their header.
   * @minLength 1
   */
  kid: string;
  /** The key use. */
  use: JwkUse;
  /** The algorithm. */
  alg: JwkAlg;
  /**
   * The x coordinate, base64url.
   * @pattern ^[A-Za-z0-9_-]{43}$
   */
  x: string;
  /**
   * The y coordinate, base64url.
   * @pattern ^[A-Za-z0-9_-]{43}$
   */
  y: string;
}

/**
 * A JSON Web Key Set (RFC 7517).
 */
export interface Jwks {
  /**
   * The current key and, for 30 days after a rotation, the previous one.
   * @minItems 1
   */
  keys: Jwk[];
}

/**
 * The receiver's answer. Any 2xx acknowledges the delivery; any other status, or no answer within 10 s, is retried after 1 min, 5 min, 30 min, 2 h, 6 h and 24 h.
 */
export type DeliveryAcceptedResponse = void;

/**
 * The request does not match the schema (`validation_error`).
 */
export type BadRequestResponse = Problem;

/**
 * The request does not match the schema (`validation_error`).
 */
export type BadRequestLimitedResponse = Problem;

/**
 * The API key is missing, malformed, expired or revoked, or the request signature is wrong (`unauthorized`).
 */
export type UnauthorizedResponse = Problem;

/**
 * The API key is missing, malformed, expired or revoked, or the request signature is wrong (`unauthorized`).
 */
export type UnauthorizedLimitedResponse = Problem;

/**
 * The key lacks the scope (`forbidden_scope`), the caller's address is outside the key's allowlist (`ip_not_allowed`), or the tenant is suspended (`tenant_suspended`).
 */
export type ForbiddenResponse = Problem;

/**
 * The key lacks the scope (`forbidden_scope`), the caller's address is outside the key's allowlist (`ip_not_allowed`), or the tenant is suspended (`tenant_suspended`).
 */
export type ForbiddenLimitedResponse = Problem;

/**
 * No session with this id belongs to the tenant (`session_not_found`).
 */
export type SessionNotFoundResponse = Problem;

/**
 * No session with this id belongs to the tenant (`session_not_found`).
 */
export type SessionNotFoundLimitedResponse = Problem;

/**
 * The session has no verdict yet (`result_pending`: poll with backoff or use webhooks), or no session with this id belongs to the tenant (`session_not_found`).
 */
export type ResultNotFoundResponse = Problem;

/**
 * No webhook endpoint with this id belongs to the tenant (`webhook_not_found`).
 */
export type WebhookNotFoundResponse = Problem;

/**
 * No webhook endpoint with this id belongs to the tenant (`webhook_not_found`).
 */
export type WebhookNotFoundLimitedResponse = Problem;

/**
 * No job with this id belongs to the tenant (`job_not_found`).
 */
export type JobNotFoundResponse = Problem;

/**
 * The session has already ended (`session_not_cancellable`).
 */
export type SessionNotCancellableResponse = Problem;

/**
 * The tenant already has 5 endpoints (`webhook_limit`).
 */
export type WebhookLimitResponse = Problem;

/**
 * The session's evidence was deleted at the end of its retention (`evidence_expired`).
 */
export type EvidenceExpiredResponse = Problem;

/**
 * The `Idempotency-Key` was used with a different body in the last 24 h (`idempotency_conflict`).
 */
export type IdempotencyConflictResponse = Problem;

/**
 * The `Idempotency-Key` was used with a different body in the last 24 h (`idempotency_conflict`), or `policy.version` names no version of the tenant's policy (`policy_version_unknown`).
 */
export type UnprocessableSessionResponse = Problem;

/**
 * The rate limit is exhausted (`rate_limited`); retry after `Retry-After` seconds.
 */
export type TooManyRequestsResponse = Problem;

/**
 * An unexpected server error (`internal_error`); retry with backoff.
 */
export type InternalErrorResponse = Problem;

/**
 * An unexpected server error (`internal_error`); retry with backoff.
 */
export type InternalErrorLimitedResponse = Problem;

/**
 * At most 128 characters. The same key with the same body returns the original response for 24 h; with a different body, 422 `idempotency_conflict`.
 */
export type IdempotencyKeyParameter = string;

/**
 * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
 */
export type ZakadiSignatureParameter = string;

/**
 * The `next_cursor` of the previous page; absent for the first page.
 */
export type CursorParameter = string;

/**
 * Items per page, at most 100.
 */
export type LimitParameter = number;

export type WebhookEventIdParameter = EventId;

/**
 * Unix seconds when the delivery was signed; receivers reject one older than 300 s.
 */
export type WebhookTimestampParameter = number;

/**
 * `v1=` and the hex HMAC-SHA256 under the endpoint's secret of `<Zakadi-Webhook-Id>.<Zakadi-Webhook-Timestamp>.<raw body>`.
 */
export type WebhookSignatureParameter = string;

export type CreateSessionHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
  /**
   * At most 128 characters. The same key with the same body returns the original response for 24 h; with a different body, 422 `idempotency_conflict`.
   * @minLength 1
   * @maxLength 128
   */
  "Idempotency-Key"?: IdempotencyKeyParameter;
};

export type ListSessionsParams = {
  /**
   * Only sessions created for this end-user reference.
   * @minLength 1
   */
  user_ref?: string;
  /**
   * Only sessions in this status.
   */
  status?: SessionStatus;
  /**
   * Only sessions created at or after this time.
   */
  from?: string;
  /**
   * Only sessions created before this time.
   */
  to?: string;
  /**
   * The `next_cursor` of the previous page; absent for the first page.
   * @minLength 1
   */
  cursor?: CursorParameter;
  /**
   * Items per page, at most 100.
   * @minimum 1
   * @maximum 100
   */
  limit?: LimitParameter;
};

export type ListSessionsHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetSessionHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type PurgeSessionHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type CancelSessionHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetResultHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetEvidenceHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type PurgeSubjectHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetJobHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type CreateWebhookHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
  /**
   * At most 128 characters. The same key with the same body returns the original response for 24 h; with a different body, 422 `idempotency_conflict`.
   * @minLength 1
   * @maxLength 128
   */
  "Idempotency-Key"?: IdempotencyKeyParameter;
};

export type ListWebhooksHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetWebhookHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type UpdateWebhookHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type DeleteWebhookHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type ListWebhookDeliveriesParams = {
  /**
   * The `next_cursor` of the previous page; absent for the first page.
   * @minLength 1
   */
  cursor?: CursorParameter;
  /**
   * Items per page, at most 100.
   * @minimum 1
   * @maximum 100
   */
  limit?: LimitParameter;
};

export type ListWebhookDeliveriesHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetPolicyHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type UpdatePolicyHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetUsageParams = {
  /**
   * The first UTC day counted.
   */
  from: string;
  /**
   * The last UTC day counted.
   */
  to: string;
};

export type GetUsageHeaders = {
  /**
   * Optional request signing for high-assurance tenants: `t=<unix>,v1=<hex hmac-sha256(secret, t + "." + method + "." + path + "." + sha256(body))>`, refused when `t` is more than 300 s from server time.
   * @pattern ^t=[0-9]+,v1=[0-9a-f]{64}$
   */
  "Zakadi-Signature"?: ZakadiSignatureParameter;
};

export type GetSdkConfigParams = {
  /**
   * The SDK's platform.
   */
  platform: Channel;
  /**
   * The SDK's version.
   */
  version: SemVer;
  /**
   * The wrapper package and its version, `<name>@<version>`, when a wrapper embeds the SDK.
   * @pattern ^.+@[0-9]+\.[0-9]+\.[0-9]+
   */
  wrapper?: string;
};
