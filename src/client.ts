// The Zakadi client of spec/02-api.md 2.11: the HTTP layer with its retry rules, and the
// sessions, results and webhooks calls, on fetch and node:crypto alone.
import { randomUUID, type KeyObject } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { ApiError, ResultPending } from "./errors.js";
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
/** Retries after the first attempt, on 429 and 5xx only (2.11). */
const MAX_RETRIES = 2;
/** A Retry-After longer than this is not waited out: the ApiError is thrown. */
const MAX_RETRY_AFTER_MS = 60_000;
/** The first backoff without a Retry-After, jittered below it and doubled per retry. */
const BACKOFF_MS = 500;

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
    return (await this.#transport.request("POST", "/v1/sessions", body, {
      "idempotency-key": idempotencyKey,
    })) as Session;
  }

  /**
   * `GET /v1/sessions/{id}/result` (2.3): resolves to the 200 body, or throws
   * `ResultPending` until the verdict exists.
   */
  async result(id: string): Promise<Result> {
    return (await this.#transport.request(
      "GET",
      `/v1/sessions/${encodeURIComponent(id)}/result`,
    )) as Result;
  }
}

class Results {
  readonly #transport: Transport;
  #keys: Promise<Map<string, KeyObject>> | undefined;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  /**
   * Resolves to the claims of `token` when it is an unexpired ES256 JWS signed by a key
   * of `/.well-known/jwks.json` (2.3, 2.8); throws `VerificationError` otherwise. The
   * JWKS is fetched once, and again when a token names an unknown `kid` (2.11).
   */
  async verifyToken(token: string): Promise<ResultTokenClaims> {
    const claims = await verifyEs256(token, (kid) => this.#key(kid));
    return claims as unknown as ResultTokenClaims;
  }

  async #key(kid: string): Promise<KeyObject | undefined> {
    try {
      const known = await (this.#keys ??= this.#fetchKeys());
      if (known.has(kid)) {
        return known.get(kid);
      }
      return (await (this.#keys = this.#fetchKeys())).get(kid);
    } catch (error) {
      // A failed fetch is not kept: the next token fetches the JWKS again.
      this.#keys = undefined;
      throw error;
    }
  }

  async #fetchKeys(): Promise<Map<string, KeyObject>> {
    return es256Keys(
      await this.#transport.request("GET", "/.well-known/jwks.json"),
    );
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

/** One idempotent call to the API, retried on 429 and 5xx within MAX_RETRIES (2.11). */
class Transport {
  readonly #apiKey: string;
  readonly #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<unknown> {
    const sent: Record<string, string> = {
      accept: "application/json",
      ...headers,
    };
    // The key goes to /v1/ only, never to a public path such as the JWKS.
    if (path.startsWith("/v1/")) {
      sent["authorization"] = `Bearer ${this.#apiKey}`;
    }
    const init: RequestInit = { method, headers: sent };
    if (body !== undefined) {
      sent["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    for (let retries = 0; ; retries += 1) {
      const response = await fetch(this.#baseUrl + path, init);
      if (response.ok) {
        return await response.json();
      }
      const delay =
        retries < MAX_RETRIES ? retryDelay(response, retries) : undefined;
      if (delay === undefined) {
        throw await apiError(response);
      }
      await response.body?.cancel();
      await sleep(delay);
    }
  }
}

/** The wait before retrying `response`, or undefined when it is not retried. */
function retryDelay(response: Response, retries: number): number | undefined {
  if (response.status !== 429 && response.status < 500) {
    return undefined;
  }
  const retryAfter = response.headers.get("retry-after")?.trim();
  if (retryAfter) {
    const seconds = /^\d+$/.test(retryAfter)
      ? Number(retryAfter)
      : (Date.parse(retryAfter) - Date.now()) / 1000;
    if (!Number.isNaN(seconds)) {
      const wait = Math.max(0, seconds * 1000);
      return wait <= MAX_RETRY_AFTER_MS ? wait : undefined;
    }
  }
  const backoff = BACKOFF_MS * 2 ** retries;
  return backoff / 2 + (Math.random() * backoff) / 2;
}

/** The typed error for a non-2xx `response`, from its problem body (2.1). */
async function apiError(response: Response): Promise<ApiError> {
  let problem: Record<string, unknown> = {};
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null) {
      problem = body as Record<string, unknown>;
    }
  } catch {
    // Not JSON, such as a proxy's error page: the status and the header remain.
  }
  const text = (value: unknown) =>
    typeof value === "string" ? value : undefined;
  const fields = {
    code: text(problem.code),
    detail: text(problem.detail),
    requestId:
      text(problem.request_id) ??
      response.headers.get("zakadi-request-id") ??
      undefined,
  };
  return fields.code === "result_pending"
    ? new ResultPending(response.status, fields)
    : new ApiError(response.status, fields);
}
