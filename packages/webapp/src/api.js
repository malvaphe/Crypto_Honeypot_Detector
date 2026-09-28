// API client. VITE_API_URL can point to a remote API server (default: same origin).
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function request(path) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch {
    throw new Error('Cannot reach the API server.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export const getChains = () => request('/api/v1/chains').then((r) => r.chains);

export function checkToken({ chain, token, dex, base, fee, amount, all }) {
  const q = new URLSearchParams();
  if (dex) q.set('dex', dex);
  if (base) q.set('base', base);
  if (fee) q.set('fee', fee);
  if (amount) q.set('amount', amount);
  if (all) q.set('all', 'true');
  const qs = q.toString();
  return request(`/api/v1/check/${encodeURIComponent(chain)}/${encodeURIComponent(token)}${qs ? `?${qs}` : ''}`);
}
