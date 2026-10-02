// The Zakadi client of spec/02-api.md 2.11: the hand-written layer over the functions
// generated from the OpenAPI document into src/generated/ (D84), and the result-token and
// webhook checks, on fetch and node:crypto alone.
import { randomUUID, type KeyObject } from "node:crypto";
import * as api from "./generated/api.js";
import type * as models from "./generated/api.schemas.js";
import { Transport, type Call } from "./transport.js";
import type { ResultTokenClaims } from "./types.js";
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

/**
 * How a method calls its generated function (2.11): `retried` on a 429 or 5xx for an
 * idempotent call, `once` for any other.
 */
interface Calls {
  retried: Call;
  once: Call;
}

/** The server-side client for the Zakadi API (spec/02-api.md 2.11). */
export class Zakadi {
  /** Create, read, list and cancel sessions; their results, evidence and purge (2.2, 2.3). */
  readonly sessions: Sessions;
  /** Purge everything held for an end user (2.3). */
  readonly subjects: Subjects;
  /** Read the jobs `subjects.purge` starts (2.3). */
  readonly jobs: Jobs;
  /** Manage webhook endpoints and verify a delivery (2.4). */
  readonly webhooks: Webhooks;
  /** Read and replace the tenant policy, and read usage (2.5, 2.7). */
  readonly tenants: Tenants;
  /** Verify a result token (2.3). */
  readonly results: Results;

  constructor(options: Options) {
    if (typeof options?.apiKey !== "string" || options.apiKey === "") {
      throw new TypeError("Zakadi: apiKey is required");
    }
    const transport = new Transport(
      options.apiKey,
      options.baseUrl ?? DEFAULT_BASE_URL,
    );
    const calls: Calls = {
      retried: { transport, retry: true },
      once: { transport, retry: false },
    };
    this.sessions = new Sessions(calls);
    this.subjects = new Subjects(calls);
    this.jobs = new Jobs(calls);
    this.webhooks = new Webhooks(calls);
    this.tenants = new Tenants(calls);
    this.results = new Results(transport);
  }
}

class Sessions {
  readonly #calls: Calls;

  constructor(calls: Calls) {
    this.#calls = calls;
  }

  /**
   * `createSession`, `POST /v1/sessions` (2.2): resolves to the 201 body as sent.
   * `Idempotency-Key` is `options.idempotencyKey`, or a random UUID, and stays the same
   * on every retry.
   */
  async create(
    body: models.SessionCreate,
    options: { idempotencyKey?: string } = {},
  ): Promise<models.SessionCreated> {
    const idempotencyKey = options.idempotencyKey ?? randomUUID();
    return api.createSession(
      body,
      { "Idempotency-Key": idempotencyKey },
      this.#calls.retried,
    );
  }

  /** `getSession`, `GET /v1/sessions/{id}` (2.2): the session's status and timestamps. */
  async get(id: string): Promise<models.Session> {
    return api.getSession(id, undefined, this.#calls.retried);
  }

  /** `listSessions`, `GET /v1/sessions` (2.2): one page of sessions, newest first. */
  async list(
    query: models.ListSessionsParams = {},
  ): Promise<models.SessionPage> {
    return api.listSessions(query, undefined, this.#calls.retried);
  }

  /** `cancelSession`, `POST /v1/sessions/{id}/cancel` (2.2), never retried. */
  async cancel(id: string): Promise<models.Session> {
    return api.cancelSession(id, undefined, this.#calls.once);
  }

  /**
   * `getResult`, `GET /v1/sessions/{id}/result` (2.3): resolves to the 200 body, or
   * throws `ResultPending` until the verdict exists.
   */
  async result(id: string): Promise<models.Result> {
    return api.getResult(id, undefined, this.#calls.retried);
  }

  /**
   * `getEvidence`, `GET /v1/sessions/{id}/evidence` (2.3), with the scope
   * `evidence:read`; throws `ResultPending` until the verdict exists.
   */
  async evidence(id: string): Promise<models.SessionEvidence> {
    return api.getEvidence(id, undefined, this.#calls.retried);
  }

  /**
   * `purgeSession`, `DELETE /v1/sessions/{id}` (2.3): resolves to undefined on the 202;
   * throws `ResultPending` until the verdict exists.
   */
  async purge(id: string): Promise<void> {
    return api.purgeSession(id, undefined, this.#calls.retried);
  }
}

class Subjects {
  readonly #calls: Calls;

  constructor(calls: Calls) {
    this.#calls = calls;
  }

  /**
   * `purgeSubject`, `POST /v1/subjects/purge` (2.3), never retried: resolves to the job
   * of the 202, which `jobs.get` follows.
   */
  async purge(body: models.SubjectPurge): Promise<models.Job> {
    return api.purgeSubject(body, undefined, this.#calls.once);
  }
}

class Jobs {
  readonly #calls: Calls;

  constructor(calls: Calls) {
    this.#calls = calls;
  }

  /** `getJob`, `GET /v1/jobs/{id}` (2.3). */
  async get(id: string): Promise<models.Job> {
    return api.getJob(id, undefined, this.#calls.retried);
  }
}

class Webhooks {
  readonly #calls: Calls;

  constructor(calls: Calls) {
    this.#calls = calls;
  }

  /**
   * `createWebhook`, `POST /v1/webhooks` (2.4): resolves to the 201 body.
   * `Idempotency-Key` is `options.idempotencyKey`, or a random UUID, and stays the same
   * on every retry.
   */
  async create(
    body: models.WebhookCreate,
    options: { idempotencyKey?: string } = {},
  ): Promise<models.Webhook> {
    const idempotencyKey = options.idempotencyKey ?? randomUUID();
    return api.createWebhook(
      body,
      { "Idempotency-Key": idempotencyKey },
      this.#calls.retried,
    );
  }

  /** `listWebhooks`, `GET /v1/webhooks` (2.4): the tenant's endpoints. */
  async list(): Promise<models.WebhookList> {
    return api.listWebhooks(undefined, this.#calls.retried);
  }

  /** `getWebhook`, `GET /v1/webhooks/{id}` (2.4), without its secret. */
  async get(id: string): Promise<models.Webhook> {
    return api.getWebhook(id, undefined, this.#calls.retried);
  }

  /** `updateWebhook`, `PUT /v1/webhooks/{id}` (2.4): the endpoint as replaced. */
  async update(
    id: string,
    body: models.WebhookUpdate,
  ): Promise<models.Webhook> {
    return api.updateWebhook(id, body, undefined, this.#calls.retried);
  }

  /** `deleteWebhook`, `DELETE /v1/webhooks/{id}` (2.4): resolves to undefined on the 204. */
  async delete(id: string): Promise<void> {
    return api.deleteWebhook(id, undefined, this.#calls.retried);
  }

  /**
   * `listWebhookDeliveries`, `GET /v1/webhooks/{id}/deliveries` (2.4): one page of
   * delivery attempts, newest first.
   */
  async deliveries(
    id: string,
    query: models.ListWebhookDeliveriesParams = {},
  ): Promise<models.WebhookDeliveryPage> {
    return api.listWebhookDeliveries(id, query, undefined, this.#calls.retried);
  }

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
  ): models.WebhookEvent {
    return verifyWebhook(
      headers,
      rawBody,
      options.secret,
    ) as models.WebhookEvent;
  }
}

class Tenants {
  readonly #calls: Calls;

  constructor(calls: Calls) {
    this.#calls = calls;
  }

  /** `getPolicy`, `GET /v1/tenants/{id}/policy` (2.5): the current policy version. */
  async policy(id: string): Promise<models.Policy> {
    return api.getPolicy(id, undefined, this.#calls.retried);
  }

  /** `updatePolicy`, `PUT /v1/tenants/{id}/policy` (2.5): the new policy version. */
  async updatePolicy(
    id: string,
    body: models.PolicySettings,
  ): Promise<models.Policy> {
    return api.updatePolicy(id, body, undefined, this.#calls.retried);
  }

  /** `getUsage`, `GET /v1/tenants/{id}/usage` (2.7): session counts per UTC day. */
  async usage(id: string, query: models.GetUsageParams): Promise<models.Usage> {
    return api.getUsage(id, query, undefined, this.#calls.retried);
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
