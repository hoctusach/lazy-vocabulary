import { EDGE_BASE_URL } from '@/config';
import { clearStoredAuth, getAuthHeader } from '@/lib/auth';

export async function apiFetchAbsolute(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});

  // Attach Authorization only for our Edge Functions
  if (url.startsWith(EDGE_BASE_URL)) {
    const auth = getAuthHeader();
    for (const [k, v] of Object.entries(auth)) headers.set(k, v);
  }

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    // Token invalid/expired → sign out locally
    clearStoredAuth({ keepPasscode: true });
  }
  return res;
}
