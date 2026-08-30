import type { components } from './generated/justvotes';

export type ProblemDetails = components['schemas']['Problem'];
export type ErrorMessageKey = 'errors.network' | 'errors.unauthorized' | 'errors.forbidden' | 'errors.notFound' | 'errors.conflict' | 'errors.generic';

export type FrontendError = {
  kind: 'problem' | 'network';
  status: number | null;
  code: string;
  detail: string | null;
  retryable: boolean;
  messageKey: ErrorMessageKey;
};

export class ApiError extends Error {
  readonly frontend: FrontendError;

  constructor(frontend: FrontendError, cause?: unknown) {
    super(frontend.detail ?? frontend.code, { cause });
    this.name = 'ApiError';
    this.frontend = frontend;
  }
}

export function problemError(problem: Partial<ProblemDetails>, status: number): ApiError {
  return new ApiError({
    kind: 'problem',
    status,
    code: problem.code ?? `http_${status}`,
    detail: problem.detail ?? problem.title ?? null,
    retryable: status >= 500,
    messageKey: messageKeyForStatus(status),
  });
}

export function networkError(cause: unknown): ApiError {
  return new ApiError({ kind: 'network', status: null, code: 'network_error', detail: null, retryable: true, messageKey: 'errors.network' }, cause);
}

function messageKeyForStatus(status: number): ErrorMessageKey {
  if (status === 401) return 'errors.unauthorized';
  if (status === 403) return 'errors.forbidden';
  if (status === 404) return 'errors.notFound';
  if (status === 409) return 'errors.conflict';
  return 'errors.generic';
}
