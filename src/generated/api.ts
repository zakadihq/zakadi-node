import type {
  CancelSessionHeaders,
  CreateSessionHeaders,
  CreateWebhookHeaders,
  DeleteWebhookHeaders,
  GetEvidenceHeaders,
  GetJobHeaders,
  GetPolicyHeaders,
  GetResultHeaders,
  GetSdkConfigParams,
  GetSessionHeaders,
  GetUsageHeaders,
  GetUsageParams,
  GetWebhookHeaders,
  Health,
  IngestHealth,
  Job,
  Jwks,
  ListSessionsHeaders,
  ListSessionsParams,
  ListWebhookDeliveriesHeaders,
  ListWebhookDeliveriesParams,
  ListWebhooksHeaders,
  Policy,
  PolicySettings,
  PurgeSessionHeaders,
  PurgeSubjectHeaders,
  Result,
  SdkConfig,
  Session,
  SessionCreate,
  SessionCreated,
  SessionEvidence,
  SessionPage,
  SubjectPurge,
  TelemetryBatch,
  UpdatePolicyHeaders,
  UpdateWebhookHeaders,
  Usage,
  Webhook,
  WebhookCreate,
  WebhookDeliveryPage,
  WebhookList,
  WebhookUpdate,
} from "./api.schemas.js";

import { send } from "../transport.js";

export const getCreateSessionUrl = () => {
  return `/v1/sessions`;
};

/**
 * Creates a session for one end user. The RP passes `client_token`, `ingest`, `prompt_pack` and `ui` to the SDK unchanged and never logs the token. The same `Idempotency-Key` with the same body returns the original response for 24 h; with a different body the answer is 422 `idempotency_conflict`. `evidence.clip` needs the tenant policy's `evidence_clip_allowed`. Rate limited per key: 600 requests per minute by default, tenant-configurable.
 * @summary Create a session
 */
export const createSession = async (
  sessionCreate: SessionCreate,
  headers?: CreateSessionHeaders,
  options?: Parameters<typeof send>[1],
): Promise<SessionCreated> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<SessionCreated>(getCreateSessionUrl(), {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...getHeaders(options?.headers),
    },
    body: JSON.stringify(sessionCreate),
  });
};

export const getListSessionsUrl = (params?: ListSessionsParams) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : String(value));
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/v1/sessions?${stringifiedParams}`
    : `/v1/sessions`;
};

/**
 * Lists the tenant's sessions newest first, one page at a time; `next_cursor` fetches the next page and is null on the last. Rate limited per key: 3,000 GET requests per minute.
 * @summary List sessions
 */
export const listSessions = async (
  params?: ListSessionsParams,
  headers?: ListSessionsHeaders,
  options?: Parameters<typeof send>[1],
): Promise<SessionPage> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<SessionPage>(getListSessionsUrl(params), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getGetSessionUrl = (id: string) => {
  return `/v1/sessions/${encodeURIComponent(String(id))}`;
};

/**
 * Returns the session's status and timestamps. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get a session
 */
export const getSession = async (
  id: string,
  headers?: GetSessionHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Session> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Session>(getGetSessionUrl(id), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getPurgeSessionUrl = (id: string) => {
  return `/v1/sessions/${encodeURIComponent(String(id))}`;
};

/**
 * Purges the session's evidence, embeddings and media-derived data at once and marks its result `purged`; the decision and timestamps are kept for 30 days for billing and dispute handling, then deleted.
 * @summary Purge a session's data
 */
export const purgeSession = async (
  id: string,
  headers?: PurgeSessionHeaders,
  options?: Parameters<typeof send>[1],
): Promise<void> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<void>(getPurgeSessionUrl(id), {
    ...options,
    method: "DELETE",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getCancelSessionUrl = (id: string) => {
  return `/v1/sessions/${encodeURIComponent(String(id))}/cancel`;
};

/**
 * Cancels a session that has not ended; if it is connected, the edge sends `end aborted user_cancel` (reason `rp_cancel`).
 * @summary Cancel a session
 */
export const cancelSession = async (
  id: string,
  headers?: CancelSessionHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Session> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Session>(getCancelSessionUrl(id), {
    ...options,
    method: "POST",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getGetResultUrl = (id: string) => {
  return `/v1/sessions/${encodeURIComponent(String(id))}/result`;
};

/**
 * Returns the verdict. Until it exists the answer is 404 with code `result_pending`: poll with backoff or use webhooks. RPs act on `decision` and `band`; `confidence` is for analytics. Raw sub-scores are in `getEvidence`. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get a session's result
 */
export const getResult = async (
  id: string,
  headers?: GetResultHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Result> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Result>(getGetResultUrl(id), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getGetEvidenceUrl = (id: string) => {
  return `/v1/sessions/${encodeURIComponent(String(id))}/evidence`;
};

/**
 * Scope `evidence:read`. Returns the sub-scores, forensic scalars, timing distributions, the per-challenge score tables, and signed URLs valid for 15 minutes for the audit frames and the clip if one was kept. Every call is written to the audit log with the caller's key id. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get a session's evidence
 */
export const getEvidence = async (
  id: string,
  headers?: GetEvidenceHeaders,
  options?: Parameters<typeof send>[1],
): Promise<SessionEvidence> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<SessionEvidence>(getGetEvidenceUrl(id), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getPurgeSubjectUrl = () => {
  return `/v1/subjects/purge`;
};

/**
 * Data-subject deletion: purges everything held for `user_ref` across sessions. `getJob` reports when the job completes.
 * @summary Purge everything held for an end user
 */
export const purgeSubject = async (
  subjectPurge: SubjectPurge,
  headers?: PurgeSubjectHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Job> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Job>(getPurgeSubjectUrl(), {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...getHeaders(options?.headers),
    },
    body: JSON.stringify(subjectPurge),
  });
};

export const getGetJobUrl = (id: string) => {
  return `/v1/jobs/${encodeURIComponent(String(id))}`;
};

/**
 * Reports the state of a job `purgeSubject` started. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get a job
 */
export const getJob = async (
  id: string,
  headers?: GetJobHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Job> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Job>(getGetJobUrl(id), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getCreateWebhookUrl = () => {
  return `/v1/webhooks`;
};

/**
 * Registers an endpoint for session events; a tenant has at most 5. The same `Idempotency-Key` with the same body returns the original response for 24 h; with a different body the answer is 422 `idempotency_conflict`.
 * @summary Create a webhook endpoint
 */
export const createWebhook = async (
  webhookCreate: WebhookCreate,
  headers?: CreateWebhookHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Webhook> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Webhook>(getCreateWebhookUrl(), {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...getHeaders(options?.headers),
    },
    body: JSON.stringify(webhookCreate),
  });
};

export const getListWebhooksUrl = () => {
  return `/v1/webhooks`;
};

/**
 * Lists the tenant's endpoints, at most 5. Rate limited per key: 3,000 GET requests per minute.
 * @summary List webhook endpoints
 */
export const listWebhooks = async (
  headers?: ListWebhooksHeaders,
  options?: Parameters<typeof send>[1],
): Promise<WebhookList> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<WebhookList>(getListWebhooksUrl(), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getGetWebhookUrl = (id: string) => {
  return `/v1/webhooks/${encodeURIComponent(String(id))}`;
};

/**
 * Returns one endpoint; the secret is never returned. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get a webhook endpoint
 */
export const getWebhook = async (
  id: string,
  headers?: GetWebhookHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Webhook> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Webhook>(getGetWebhookUrl(id), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getUpdateWebhookUrl = (id: string) => {
  return `/v1/webhooks/${encodeURIComponent(String(id))}`;
};

/**
 * Replaces the endpoint's `url`, `events` and `active`; a `secret`, when given, replaces the signing secret.
 * @summary Replace a webhook endpoint
 */
export const updateWebhook = async (
  id: string,
  webhookUpdate: WebhookUpdate,
  headers?: UpdateWebhookHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Webhook> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Webhook>(getUpdateWebhookUrl(id), {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...getHeaders(options?.headers),
    },
    body: JSON.stringify(webhookUpdate),
  });
};

export const getDeleteWebhookUrl = (id: string) => {
  return `/v1/webhooks/${encodeURIComponent(String(id))}`;
};

/**
 * Deletes the endpoint; no further deliveries are made to it.
 * @summary Delete a webhook endpoint
 */
export const deleteWebhook = async (
  id: string,
  headers?: DeleteWebhookHeaders,
  options?: Parameters<typeof send>[1],
): Promise<void> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<void>(getDeleteWebhookUrl(id), {
    ...options,
    method: "DELETE",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getListWebhookDeliveriesUrl = (
  id: string,
  params?: ListWebhookDeliveriesParams,
) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : String(value));
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/v1/webhooks/${encodeURIComponent(String(id))}/deliveries?${stringifiedParams}`
    : `/v1/webhooks/${encodeURIComponent(String(id))}/deliveries`;
};

/**
 * Lists the endpoint's delivery attempts with their status codes, newest first, for debugging. Rate limited per key: 3,000 GET requests per minute.
 * @summary List delivery attempts
 */
export const listWebhookDeliveries = async (
  id: string,
  params?: ListWebhookDeliveriesParams,
  headers?: ListWebhookDeliveriesHeaders,
  options?: Parameters<typeof send>[1],
): Promise<WebhookDeliveryPage> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<WebhookDeliveryPage>(getListWebhookDeliveriesUrl(id, params), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getGetPolicyUrl = (id: string) => {
  return `/v1/tenants/${encodeURIComponent(String(id))}/policy`;
};

/**
 * Scope `policy:write`. Returns the tenant's current policy version. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get the tenant policy
 */
export const getPolicy = async (
  id: string,
  headers?: GetPolicyHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Policy> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Policy>(getGetPolicyUrl(id), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getUpdatePolicyUrl = (id: string) => {
  return `/v1/tenants/${encodeURIComponent(String(id))}/policy`;
};

/**
 * Scope `policy:write`. Every PUT creates a new immutable version, returned with its `version`; a `version` in the body is ignored. Sessions pin the version current at their creation.
 * @summary Create a new policy version
 */
export const updatePolicy = async (
  id: string,
  policySettings: PolicySettings,
  headers?: UpdatePolicyHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Policy> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Policy>(getUpdatePolicyUrl(id), {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...getHeaders(options?.headers),
    },
    body: JSON.stringify(policySettings),
  });
};

export const getGetUsageUrl = (id: string, params: GetUsageParams) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : String(value));
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/v1/tenants/${encodeURIComponent(String(id))}/usage?${stringifiedParams}`
    : `/v1/tenants/${encodeURIComponent(String(id))}/usage`;
};

/**
 * Counts the tenant's sessions by status, band and channel, per UTC day, from `from` to `to` inclusive. Rate limited per key: 3,000 GET requests per minute.
 * @summary Get usage
 */
export const getUsage = async (
  id: string,
  params: GetUsageParams,
  headers?: GetUsageHeaders,
  options?: Parameters<typeof send>[1],
): Promise<Usage> => {
  const getHeaders = (
    h?: NonNullable<RequestInit["headers"]>,
  ): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(
          h as Iterable<Iterable<string>>,
          (entry) => Array.from(entry) as [string, string],
        ),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<
      string | readonly string[] | undefined
    >(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
  return send<Usage>(getGetUsageUrl(id, params), {
    ...options,
    method: "GET",
    headers: { ...headers, ...getHeaders(options?.headers) },
  });
};

export const getGetSdkConfigUrl = (params: GetSdkConfigParams) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? "null" : String(value));
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0
    ? `/v1/sdk/config?${stringifiedParams}`
    : `/v1/sdk/config`;
};

/**
 * Public, no key; cached 5 minutes. The SDK calls it at `start()`, refuses to start below `min_version` or when `kill_switch` is true, and fails open after 2 s (D10). `device_quirks` entries match when every key present matches, and their `caps` cap the capture and encoder configuration (D38). Responds with `Access-Control-Allow-Origin: *` and no credentials (D35).
 * @summary Get the SDK configuration
 */
export const getSdkConfig = async (
  params: GetSdkConfigParams,
  options?: Parameters<typeof send>[1],
): Promise<SdkConfig> => {
  return send<SdkConfig>(getGetSdkConfigUrl(params), {
    ...options,
    method: "GET",
  });
};

export const getSendTelemetryUrl = () => {
  return `/v1/telemetry`;
};

/**
 * Public, no key; rate limited per session id and IP. At most 100 events and 32 KB per call. Events are validated against the telemetry schema, and anything resembling media, tokens or landmark arrays is rejected. The body is JSON sent as `application/json`, or as `text/plain` so that `navigator.sendBeacon` can send it on page hide (D35). Responds with `Access-Control-Allow-Origin: *` and no credentials.
 * @summary Send SDK telemetry
 */
export const sendTelemetry = async (
  sendTelemetryBody: TelemetryBatch | string,
  options?: Parameters<typeof send>[1],
): Promise<void> => {
  return send<void>(getSendTelemetryUrl(), {
    ...options,
    method: "POST",
    body: JSON.stringify(sendTelemetryBody),
  });
};

export const getGetHealthUrl = () => {
  return `/v1/health`;
};

/**
 * Public, no key. Answers while the control plane is alive.
 * @summary Control plane liveness
 */
export const getHealth = async (
  options?: Parameters<typeof send>[1],
): Promise<Health> => {
  return send<Health>(getGetHealthUrl(), {
    ...options,
    method: "GET",
  });
};

export const getGetIngestHealthUrl = () => {
  return `/v1/health/ingest`;
};

/**
 * Public, no key; cached 10 s. Per-region ingest health and current admission headroom, which SDKs use only as a region ordering hint.
 * @summary Ingest health per region
 */
export const getIngestHealth = async (
  options?: Parameters<typeof send>[1],
): Promise<IngestHealth> => {
  return send<IngestHealth>(getGetIngestHealthUrl(), {
    ...options,
    method: "GET",
  });
};

export const getGetJwksUrl = () => {
  return `/.well-known/jwks.json`;
};

/**
 * Public, no key. The ES256 public keys, with `kid`, that verify `client_token` and `result_token`. Keys rotate every 90 days, and the previous key stays published for 30 days after a rotation. Clients never send the API key here.
 * @summary Get the JWKS
 */
export const getJwks = async (
  options?: Parameters<typeof send>[1],
): Promise<Jwks> => {
  return send<Jwks>(getGetJwksUrl(), {
    ...options,
    method: "GET",
  });
};
