// The Zakadi client of spec/02-api.md 2.11: the sessions, results and webhooks calls
// over the transport of src/transport.ts, on fetch and node:crypto alone.
import { randomUUID, type KeyObject } from "node:crypto";
import { Transport } from "./transport.js";
import type {
  Result,
  ResultTokenClaims,
  Session,
  SessionCreateParams,
  WebhookEvent,
} from "./types.js";
import {
  es256Keys,
  verifyEs256,
  verifyWebhook,
  type WebhookHeaders,
} from "./verify.js";

const DEFAULT_BASE_URL = "https://api.zakadi.dev";
/**
 * The least age of the last JWKS request, failed or not, before a token naming a `kid`
 * the cached JWKS lacks refetches it (2.11, D78). A key is published 24 h before it
 * signs (spec/03-backend-services.md 3.11), so the floor refuses no legitimate token.
 */
const JWKS_REFETCH_FLOOR_MS = 60_000;

/** The options of `new Zakadi(...)`. */
interface Options {
  /** The API key, sent as `Authorization: Bearer <apiKey>` on /v1/ calls (2.1). */
  apiKey: string;
  /** The API origin; `https://api.zakadi.dev` by default. */
  baseUrl?: string;
}

/** The server-side client for the Zakadi API (spec/02-api.md 2.11). */
export class Zakadi {
  /** Create a session and fetch its result (2.2, 2.3). */
  readonly sessions: Sessions;
  /** Verify a result token (2.3). */
  readonly results: Results;
  /** Verify a webhook delivery (2.4). */
  readonly webhooks: Webhooks;

  constructor(options: Options) {
    if (typeof options?.apiKey !== "string" || options.apiKey === "") {
      throw new TypeError("Zakadi: apiKey is required");
    }
    const transport = new Transport(
      options.apiKey,
      options.baseUrl ?? DEFAULT_BASE_URL,
    );
    this.sessions = new Sessions(transport);
    this.results = new Results(transport);
    this.webhooks = new Webhooks();
  }
}

class Sessions {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  /**
   * `POST /v1/sessions` (2.2): resolves to the 201 body as sent. `Idempotency-Key` is
   * `options.idempotencyKey`, or a random UUID, and stays the same on every retry.
   */
  async create(
    body: SessionCreateParams,
    options: { idempotencyKey?: string } = {},
  ): Promise<Session> {
    const idempotencyKey = options.idempotencyKey ?? randomUUID();
    return (await this.#transport.request(
      "/v1/sessions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(body),
      },
      true,
    )) as Session;
  }

  /**
   * `GET /v1/sessions/{id}/result` (2.3): resolves to the 200 body, or throws
   * `ResultPending` until the verdict exists.
   */
  async result(id: string): Promise<Result> {
    return (await this.#transport.request(
      `/v1/sessions/${encodeURIComponent(id)}/result`,
      { method: "GET" },
      true,
    )) as Result;
  }
}

class Results {
  readonly #transport: Transport;
  /** The keys of the last JWKS fetched; a failed refetch leaves them in place. */
  #keys: Map<string, KeyObject> | undefined;
  /** The JWKS request in flight, which concurrent verifications share. */
  #request: Promise<Map<string, KeyObject>> | undefined;
  /** `Date.now()` when the last JWKS request was sent, whatever its outcome. */
  #requestedAt = -Infinity;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  /**
   * Resolves to the claims of `token` when it is an unexpired ES256 JWS signed by a key
   * of `/.well-known/jwks.json` (2.3, 2.8); throws `VerificationError` otherwise. The
   * JWKS is fetched once and cached (2.11). A token naming a `kid` the cached JWKS lacks
   * refetches it when the last JWKS request, failed or not, is at least 60 s old, and
   * otherwise throws `VerificationError` without a request (D78). Concurrent
   * verifications share one request; a failed refetch throws its `ApiError` and keeps
   * the cached keys. While no JWKS is cached, every token fetches it.
   */
  async verifyToken(token: string): Promise<ResultTokenClaims> {
    const claims = await verifyEs256(token, (kid) => this.#key(kid));
    return claims as unknown as ResultTokenClaims;
  }

  async #key(kid: string): Promise<KeyObject | undefined> {
    const cached = this.#keys?.get(kid);
    if (cached !== undefined) {
      return cached;
    }
    if (
      this.#request === undefined &&
      this.#keys !== undefined &&
      Date.now() - this.#requestedAt < JWKS_REFETCH_FLOOR_MS
    ) {
      // Inside the floor: no request, and verifyEs256 throws VerificationError.
      return undefined;
    }
    this.#request ??= this.#fetchKeys().finally(() => {
      this.#request = undefined;
    });
    return (await this.#request).get(kid);
  }

  async #fetchKeys(): Promise<Map<string, KeyObject>> {
    this.#requestedAt = Date.now();
    const jwks = await this.#transport.request(
      "/.well-known/jwks.json",
      { method: "GET" },
      true,
    );
    return (this.#keys = es256Keys(jwks));
  }
}

class Webhooks {
  /**
   * Returns the event of a delivery whose `Zakadi-Webhook-Signature` is the `v1=`
   * HMAC-SHA256 of 2.4 under `secret` over `Zakadi-Webhook-Id`,
   * `Zakadi-Webhook-Timestamp` and the raw body, and whose timestamp is no older than
   * 300 s; throws `VerificationError` otherwise. Pass the body as received, before any
   * JSON parsing.
   */
  verify(
    headers: WebhookHeaders,
    rawBody: string | Uint8Array,
    options: { secret: string },
  ): WebhookEvent {
    return verifyWebhook(headers, rawBody, options.secret) as WebhookEvent;
  }
}
