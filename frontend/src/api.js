function apiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // Same-origin `/api` works on phone via Vite proxy or Go static hosting.
  return '/api';
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function req(path, opts = {}) {
  const res = await fetch(`${apiBase()}${path}`, { ...opts, headers: { ...headers(), ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  register: (body) => req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => req('/me'),
  startActivity: (name) => req('/activities', { method: 'POST', body: JSON.stringify({ name }) }),
  track: (id, points) => req(`/activities/${id}/track`, { method: 'POST', body: JSON.stringify({ points }) }),
  finish: (id, name) => req(`/activities/${id}/finish`, { method: 'POST', body: JSON.stringify({ name }) }),
  myActivities: () => req('/activities'),
  activity: (id) => req(`/activities/${id}`),
  feed: () => req('/feed'),
  territory: (bbox) => {
    const q = bbox
      ? `?min_lat=${bbox.minLat}&min_lng=${bbox.minLng}&max_lat=${bbox.maxLat}&max_lng=${bbox.maxLng}`
      : '';
    return req(`/territory${q}`);
  },
  leaderboard: () => req('/leaderboard'),
};
