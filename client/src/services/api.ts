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
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { success: false, message: response.status === 502 ? 'The API server is not running.' : 'The server returned a non-JSON response.', errors: [] };
  if (!response.ok || !payload.success) throw new ApiError(payload.message ?? 'Request failed.', response.status, payload.errors);
  return payload.data as T;
}
