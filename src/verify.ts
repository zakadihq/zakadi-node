// The two signature checks of the client, on node:crypto alone: the ES256 result token
// of spec/02-api.md 2.3 and 2.8, and the webhook signature of 2.4.
import { Buffer } from "node:buffer";
import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import { VerificationError } from "./errors.js";

/** Receivers reject webhook timestamps older than this many seconds (2.4). */
const WEBHOOK_MAX_AGE_S = 300;

/** Request headers as Node's `IncomingMessage` or a fetch `Headers` carries them. */
export type WebhookHeaders =
  Headers | Record<string, string | string[] | undefined>;

/**
 * The parsed body of a webhook delivery whose `Zakadi-Webhook-Signature` is
 * `v1=<hex hmac-sha256(secret, id + "." + timestamp + "." + body)>`, compared in
 * constant time, and whose timestamp is no older than 300 s (2.4); throws
 * `VerificationError` otherwise.
 */
export function verifyWebhook(
  headers: WebhookHeaders,
  rawBody: string | Uint8Array,
  secret: string,
): unknown {
  if (typeof secret !== "string" || secret === "") {
    throw new TypeError("webhooks.verify: secret is required");
  }
  const id = header(headers, "zakadi-webhook-id");
  const timestamp = header(headers, "zakadi-webhook-timestamp");
  const signature = /^v1=([0-9a-f]{64})$/i.exec(
    header(headers, "zakadi-webhook-signature")?.trim() ?? "",
  )?.[1];
  if (
    id === undefined ||
    timestamp === undefined ||
    !/^\d+$/.test(timestamp) ||
    signature === undefined
  ) {
    throw new VerificationError(
      "webhook: Zakadi-Webhook-Id, -Timestamp or -Signature is missing or malformed",
    );
  }
  const body =
    typeof rawBody === "string"
      ? Buffer.from(rawBody, "utf8")
      : Buffer.from(rawBody);
  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.`)
    .update(body)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
    throw new VerificationError("webhook: signature does not match");
  }
  if (Math.floor(Date.now() / 1000) - Number(timestamp) > WEBHOOK_MAX_AGE_S) {
    throw new VerificationError("webhook: timestamp is older than 300 s");
  }
  try {
    return JSON.parse(body.toString("utf8")) as unknown;
  } catch {
    throw new VerificationError("webhook: body is not JSON");
  }
}

/** The keys of a JWKS (2.8) that verify ES256, by `kid`; any other key is skipped. */
export function es256Keys(jwks: unknown): Map<string, KeyObject> {
  const keys = new Map<string, KeyObject>();
  const list: unknown[] =
    isObject(jwks) && Array.isArray(jwks.keys) ? jwks.keys : [];
  for (const jwk of list) {
    if (
      !isObject(jwk) ||
      typeof jwk.kid !== "string" ||
      jwk.kty !== "EC" ||
      jwk.crv !== "P-256" ||
      (jwk.alg !== undefined && jwk.alg !== "ES256") ||
      (jwk.use !== undefined && jwk.use !== "sig")
    ) {
      continue;
    }
    try {
      keys.set(
        jwk.kid,
        createPublicKey({ key: jwk as JsonWebKey, format: "jwk" }),
      );
    } catch {
      // A malformed key verifies nothing.
    }
  }
  return keys;
}

/**
 * The claims of `token` when it is a compact JWS with `alg` ES256, signed by the key
 * `keyFor` returns for its `kid`, and unexpired; throws `VerificationError` otherwise.
 */
export async function verifyEs256(
  token: string,
  keyFor: (kid: string) => Promise<KeyObject | undefined>,
): Promise<Record<string, unknown>> {
  const [encodedHeader, encodedClaims, encodedSignature, ...rest] =
    typeof token === "string" ? token.split(".") : [];
  if (
    encodedHeader === undefined ||
    encodedClaims === undefined ||
    encodedSignature === undefined ||
    rest.length > 0
  ) {
    throw new VerificationError("result token: not a compact JWS");
  }
  const header = decodeSegment(encodedHeader);
  if (
    header.alg !== "ES256" ||
    typeof header.kid !== "string" ||
    header.crit !== undefined
  ) {
    throw new VerificationError("result token: header is not ES256 with a kid");
  }
  const key = await keyFor(header.kid);
  if (key === undefined) {
    throw new VerificationError("result token: kid is not in the JWKS");
  }
  const signature = Buffer.from(encodedSignature, "base64url");
  const signed =
    signature.length === 64 &&
    verify(
      "sha256",
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      { key, dsaEncoding: "ieee-p1363" },
      signature,
    );
  if (!signed) {
    throw new VerificationError("result token: signature does not verify");
  }
  const claims = decodeSegment(encodedClaims);
  if (typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) {
    throw new VerificationError("result token: expired, or without exp");
  }
  return claims;
}

function decodeSegment(segment: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    value = undefined;
  }
  if (!isObject(value)) {
    throw new VerificationError(
      "result token: a segment is not a base64url JSON object",
    );
  }
  return value;
}

function header(headers: WebhookHeaders, name: string): string | undefined {
  if (isHeaders(headers)) {
    return headers.get(name) ?? undefined;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

function isHeaders(headers: WebhookHeaders): headers is Headers {
  return typeof headers.get === "function";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
