const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly errors: unknown[] = []) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init
  });
  const contentType = response.headers.get('content-type') ?? '';
  let payload: any;
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text().catch(() => '');
    payload = {
      success: false,
      message: response.status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : response.status === 502
          ? 'The API server is not running.'
          : text.slice(0, 100) || 'The server returned an unexpected response.',
      errors: []
    };
  }
  if (!response.ok || !payload.success) throw new ApiError(payload.message ?? 'Request failed.', response.status, payload.errors);
  return payload.data as T;
}
