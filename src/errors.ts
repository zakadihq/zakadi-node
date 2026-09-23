// The typed errors of spec/02-api.md 2.11, named as in the Python client (D71).

/** The fields of an RFC 9457 problem body that `ApiError` carries (2.1). */
interface ProblemFields {
  code?: string | undefined;
  detail?: string | undefined;
  requestId?: string | undefined;
}

/**
 * A non-2xx response from the Zakadi API (2.1). `code` is the problem `code` of 2.9,
 * such as `rate_limited` or `session_not_found`.
 */
export class ApiError extends Error {
  override name = "ApiError";
  /** The HTTP status code. */
  readonly status: number;
  /** The problem `code` (2.9), when the body is a problem. */
  readonly code: string | undefined;
  /** The problem `detail`, when the body is a problem. */
  readonly detail: string | undefined;
  /** The problem `request_id`, else the `Zakadi-Request-Id` header. */
  readonly requestId: string | undefined;

  constructor(status: number, problem: ProblemFields = {}) {
    const code = problem.code === undefined ? "" : ` ${problem.code}`;
    const detail = problem.detail === undefined ? "" : `: ${problem.detail}`;
    super(`Zakadi API ${status}${code}${detail}`);
    this.status = status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.requestId = problem.requestId;
  }
}

/** The 404 `result_pending` of `GET /v1/sessions/{id}/result`: no verdict yet (2.3). */
export class ResultPending extends ApiError {
  override name = "ResultPending";
}

/** A webhook delivery or a result token that fails verification (2.3, 2.4). */
export class VerificationError extends Error {
  override name = "VerificationError";
}
