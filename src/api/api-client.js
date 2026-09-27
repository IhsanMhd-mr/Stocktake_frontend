const DEFAULT_API_URL = '/api';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL).replace(/\/$/, '');

let readToken = () => null;
let handleUnauthorized = () => {};

export function configureApiClient({ getToken, onUnauthorized }) {
  readToken = getToken;
  handleUnauthorized = onUnauthorized;
}

export class ApiError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export async function apiRequest(path, options = {}) {
  const token = readToken();
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  let response;
  const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    throw new ApiError({ status: 0, code: timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR', message: timedOut ? 'The server took too long to respond. Your current data has been kept.' : 'Cannot connect to the server. Check that this device is connected to the store network.' });
  } finally {
    window.clearTimeout(timeout);
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new ApiError({
      status: response.status,
      code: body?.error?.code || 'REQUEST_FAILED',
      message: body?.error?.message || 'The request could not be completed.',
      details: body?.error?.details,
      requestId: body?.error?.requestId || response.headers.get('X-Request-Id')
    });
    if (response.status === 401) handleUnauthorized();
    throw error;
  }
  return body;
}
