// The HTTP layer of spec/02-api.md 2.11, on fetch alone, and `send`, the mutator through
// which every function generated into src/generated/ reaches it (orval.config.js).
import { setTimeout as sleep } from "node:timers/promises";
import { ApiError, ResultPending } from "./errors.js";

/** Retries after the first attempt, on 429 and 5xx only (2.11). */
const MAX_RETRIES = 2;
/** A Retry-After longer than this is not waited out: the ApiError is thrown. */
const MAX_RETRY_AFTER_MS = 60_000;
/** The first backoff without a Retry-After, jittered below it and doubled per retry. */
const BACKOFF_MS = 500;

/**
 * The last argument of a generated function: the client's transport, and whether a 429
 * or 5xx is retried, which only an idempotent call may be (2.11).
 */
export interface Call extends RequestInit {
  transport?: Transport;
  retry?: boolean;
}

/**
 * The mutator of the generated functions: sends the request they build (method, path
 * with its query, headers and JSON body) through `init.transport`.
 */
export function send<T>(url: string, init: Call): Promise<T> {
  const { transport, retry = false, ...request } = init;
  if (transport === undefined) {
    throw new TypeError("send: a generated function needs a transport");
  }
  return transport.request(url, request, retry) as Promise<T>;
}

/** Calls to one API origin with one API key (2.1). */
export class Transport {
  readonly #apiKey: string;
  readonly #baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /**
   * Sends `init` to `path` and resolves to the parsed JSON body of a 2xx answer, or to
   * undefined when it has none, such as a 202 or 204. A non-2xx answer throws
   * `ApiError`; when `retry` is true a 429 or 5xx is first retried, at most
   * MAX_RETRIES times, with the same request.
   */
  async request(
    path: string,
    init: RequestInit,
    retry: boolean,
  ): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    // The key goes to /v1/ only, never to a public path such as the JWKS.
    if (path.startsWith("/v1/")) {
      headers.set("authorization", `Bearer ${this.#apiKey}`);
    }
    const sent: RequestInit = { ...init, headers };
    for (let retries = 0; ; retries += 1) {
      const response = await fetch(this.#baseUrl + path, sent);
      if (response.ok) {
        const body = await response.text();
        return body === "" ? undefined : (JSON.parse(body) as unknown);
      }
      const delay =
        retry && retries < MAX_RETRIES
          ? retryDelay(response, retries)
          : undefined;
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
