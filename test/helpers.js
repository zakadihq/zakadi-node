// Fixtures from spec/02-api.md 2.2 to 2.4 and the signing side of the checks the client
// makes, written from the spec rather than from src/.
import { Buffer } from "node:buffer";
import { createHmac, generateKeyPairSync, sign } from "node:crypto";

/** The `POST /v1/sessions` request body of 2.2. */
export const SESSION_REQUEST = {
  user_ref: "cust-88213",
  locale: "en-NG",
  channel: "android",
  device_correlation_id: "dev-42",
  policy: {
    version: 12,
    overrides: { min_actions: 2, languages: ["en-NG", "fr-CI"] },
  },
  ingest_hint: { country: "NG" },
  callback: {
    url: "https://rp.example/liveness/hook",
    secret_ref: "wh_sec_01",
  },
  metadata: { flow: "onboarding", attempt: 1 },
  evidence: { audit_frames: true, clip: false, retention_days: 7 },
};

/** The 201 body of 2.2. */
export const SESSION = {
  session_id: "ses_01J8",
  client_token: "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsxIn0.e30.c2lnbmF0dXJl",
  expires_at: "2026-09-22T10:05:00Z",
  ingest: [
    {
      region: "eu-west-2",
      url: "wss://ingest-euw2.zakadi.dev/v1/sessions/ses_01J8/stream",
    },
    {
      region: "af-south-1",
      url: "wss://ingest-afs1.zakadi.dev/v1/sessions/ses_01J8/stream",
    },
  ],
  prompt_pack: {
    lang: "en-NG",
    version: "2026.09.1",
    url: "https://cdn.zakadi.dev/packs/en-NG/2026.09.1/manifest.json",
  },
  ui: {
    consent_copy: {
      "en-NG": { title: "Consent", body: "Body", recording_notice: "Notice" },
    },
    brand: { primary: "#0A5", logo_url: null },
    badge_text: null,
    packs: [
      {
        lang: "en-NG",
        version: "2026.09.1",
        url: "https://cdn.zakadi.dev/packs/en-NG/2026.09.1/manifest.json",
      },
      {
        lang: "fr-CI",
        version: "2026.09.1",
        url: "https://cdn.zakadi.dev/packs/fr-CI/2026.09.1/manifest.json",
      },
    ],
  },
  policy_version: 12,
  status: "created",
};

/** A session's status and timestamps, the 200 body of `GET /v1/sessions/{id}` (2.2). */
export const SESSION_STATUS = {
  session_id: "ses_01J8",
  status: "passed",
  created_at: "2026-09-22T10:00:00Z",
  connected_at: "2026-09-22T10:00:21Z",
  ended_at: "2026-09-22T10:00:58Z",
  verdict_at: "2026-09-22T10:01:12Z",
  policy_version: 12,
  channel: "android",
  ingest_region: "af-south-1",
  band: "A",
  metadata: { flow: "onboarding", attempt: 1 },
};

/** The 200 body of `GET /v1/sessions/{id}/evidence` (2.3). */
export const EVIDENCE = {
  session_id: "ses_01J8",
  scores: { pad_ensemble: 0.991, nonce_reader: 0.62 },
  forensics: { qp_mean: 27.4 },
  timing: { action_latency_ms: { p50: 775, max: 910 } },
  challenges: [
    {
      idx: 0,
      id: "a1",
      kind: "head_turn",
      params: { direction: "user_left", min_deg: 20, hold_ms: 200 },
      result: "pass",
      attempts: 1,
      latency_ms: 640,
      scores: { geometry: 0.98 },
    },
  ],
  audit_frames: [
    {
      url: "https://objects-afs1.zakadi.dev/evidence/ses_01J8/frame-1?signature=7d1c",
      expires_at: "2026-09-22T10:30:00Z",
    },
  ],
  clip: null,
  expires_at: "2026-09-29T10:01:12Z",
};

/** The job of `POST /v1/subjects/purge` and `GET /v1/jobs/{id}` (2.3). */
export const JOB = {
  job_id: "job_01J8",
  kind: "subject_purge",
  status: "pending",
  created_at: "2026-09-22T13:00:00Z",
  completed_at: null,
};

/** The body of `POST /v1/webhooks` (2.4). */
export const WEBHOOK_CREATE = {
  url: "https://rp.example/liveness/hook",
  events: ["zakadi.session.completed", "zakadi.session.aborted"],
  secret: "whsec_0123456789abcdef0123456789abcdef",
  active: true,
};

/** The body of `PUT /v1/webhooks/{id}` (2.4). */
export const WEBHOOK_UPDATE = {
  url: "https://rp.example/liveness/hook",
  events: ["zakadi.session.completed"],
  active: false,
};

/** A webhook endpoint as the API returns it, without its secret (2.4). */
export const WEBHOOK = {
  webhook_id: "0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d",
  url: "https://rp.example/liveness/hook",
  events: ["zakadi.session.completed", "zakadi.session.aborted"],
  secret_ref: "wh_sec_01",
  active: true,
  created_at: "2026-09-21T16:40:00Z",
};

/** The 200 body of `GET /v1/webhooks/{id}/deliveries` (2.4). */
export const DELIVERIES = {
  data: [
    {
      webhook_id: "0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d",
      event_id: "evt_01J8",
      attempt: 1,
      status: null,
      error: "no response within 10 s",
      at: "2026-09-22T10:01:14Z",
    },
  ],
  next_cursor: null,
};

/** The body of `PUT /v1/tenants/{id}/policy` (2.5). */
export const POLICY_SETTINGS = {
  actions: {
    min: 2,
    max: 3,
    pool: ["head_turn", "distance", "fingers", "digits", "blink", "expression"],
    step_up_pool: ["hand_over_face", "look_profile"],
    require_geometry: true,
    require_high_entropy: true,
  },
  assurance: {
    accept_bands: ["A", "B"],
    web_allowed: true,
    attestation_required: false,
  },
  thresholds: { profile: "strict" },
  attempts: {
    per_action: 3,
    restarts: 2,
    sessions_per_user_ref_per_day: 10,
    sessions_per_face_per_day: 10,
  },
  step_up: { enabled: true, human_handoff: false, handoff_url: null },
  languages: ["en-NG", "fr-CI", "ha-NG"],
  retention: {
    results_days: 365,
    evidence_days_default: 7,
    evidence_days_max: 30,
    evidence_clip_allowed: false,
    embeddings_days: 30,
  },
  dedupe: { enabled: true, cross_session_face_match: true },
  residency: {
    ingest_regions: ["eu-west-2", "af-south-1"],
    gpu_regions: ["af-south-1"],
    in_country_only: false,
  },
  ui: {
    character: "default",
    brand: { primary: "#0A5", logo_url: null },
    badge_text: null,
  },
};

/** The tenant policy with its version (2.5). */
export const POLICY = { version: 13, ...POLICY_SETTINGS };

/** The 200 body of `GET /v1/tenants/{id}/usage` (2.7). */
export const USAGE = {
  from: "2026-09-21",
  to: "2026-09-22",
  data: [
    {
      day: "2026-09-21",
      channel: "android",
      band: "A",
      status: "passed",
      count: 1204,
    },
  ],
};

/** The 200 body of 2.3 around `result_token`. */
export function result(resultToken) {
  return {
    session_id: "ses_01J8",
    decision: "pass",
    band: "A",
    confidence: 0.97,
    reason_codes: ["ACTIONS_OK", "PAD_OK", "NONCE_OK", "TIMING_OK"],
    reasons_detail: [
      { code: "NONCE_WEAK", severity: "info", text: "illumination weak" },
    ],
    challenges: [
      {
        id: "a1",
        kind: "head_turn",
        result: "pass",
        attempts: 1,
        latency_ms: 640,
      },
    ],
    quality: {
      lighting: "ok",
      face_size: "ok",
      network_rung_median: 2,
      received_fps_median: 14.6,
    },
    device: {
      platform: "android",
      attested: true,
      attestation_verdict: "MEETS_DEVICE_INTEGRITY",
    },
    models: { fusion: "fusion@0.9.2" },
    policy_version: 12,
    verdict_at: "2026-09-22T10:01:12Z",
    evidence: {
      audit_frames: 2,
      clip: false,
      expires_at: "2026-09-29T10:01:12Z",
    },
    metadata: { flow: "onboarding", attempt: 1 },
    result_token: resultToken,
  };
}

/** The claims of a result token (2.3) that expires `ttl` seconds from now. */
export function resultClaims(ttl = 3600) {
  const iat = Math.floor(Date.now() / 1000);
  return {
    iss: "https://api.zakadi.dev",
    aud: "ten_01",
    sub: "ses_01J8",
    jti: "jti_01",
    iat,
    exp: iat + ttl,
    decision: "pass",
    band: "A",
    confidence: 0.97,
    reason_codes: ["ACTIONS_OK"],
    user_ref_hash: "c2hh",
    policy_version: 12,
    models_hash: "bW9kZWxz",
  };
}

/** A P-256 key pair and its public JWK under `kid` (2.8). */
export function signingKey(kid) {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid, alg: "ES256" };
  return { kid, privateKey, jwk: { ...jwk, use: "sig" } };
}

/** A compact ES256 JWS of `claims` by `key`; `header` adds to or overrides its header. */
export function signToken(key, claims, header = {}) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encode({ alg: "ES256", kid: key.kid, ...header })}.${encode(claims)}`;
  const signature = sign("sha256", Buffer.from(input), {
    key: key.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${signature.toString("base64url")}`;
}

/** A webhook body of 2.4. */
export function webhookBody(resultToken = "eyJ.eyJ.sig") {
  const data = result(resultToken);
  delete data.result_token;
  return JSON.stringify({
    id: "evt_01J8",
    type: "zakadi.session.completed",
    created_at: "2026-09-22T10:01:13Z",
    data,
    result_token: resultToken,
  });
}

/** The delivery headers of 2.4 for `body` under `secret`. */
export function webhookHeaders(
  secret,
  body,
  { id = "evt_01J8", timestamp = Math.floor(Date.now() / 1000) } = {},
) {
  const mac = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("hex");
  return {
    "zakadi-webhook-id": id,
    "zakadi-webhook-timestamp": String(timestamp),
    "zakadi-webhook-signature": `v1=${mac}`,
  };
}

/** An RFC 9457 problem response (2.1) with `code` and `request_id`. */
export function problem(status, code, extraHeaders = {}) {
  return Response.json(
    {
      type: `https://api.zakadi.dev/problems/${code}`,
      title: code,
      status,
      detail: `detail of ${code}`,
      code,
      request_id: `req_${code}`,
    },
    {
      status,
      headers: { "content-type": "application/problem+json", ...extraHeaders },
    },
  );
}

/**
 * Replaces the global fetch for one test: `reply` answers each call, which is recorded
 * as `{url, method, headers, body}`. Unit tests use it so no request leaves the process.
 */
export function fakeFetch(t, reply) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const call = {
      url: new URL(String(input)),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: init.body,
    };
    calls.push(call);
    return reply(call, calls.length);
  });
  return calls;
}
