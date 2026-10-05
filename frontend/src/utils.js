export function distanceM(a, b) {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m) {
  if (m == null) return '0 m';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatDuration(s) {
  if (!s || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatPace(distanceM, durationS) {
  if (!distanceM || distanceM < 50 || !durationS) return '—';
  const pace = durationS / (distanceM / 1000); // sec per km
  const m = Math.floor(pace / 60);
  const s = Math.floor(pace % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function cellAreaKm2(cells) {
  return (cells * 0.055 * 0.055).toFixed(3);
}
